import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCommandPaletteResults } from '../../utils/fuzzySearch';
import { fetchSubjectsFromSupabase, fetchAllPapersFromSupabase } from '../../services/papersService';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';
import AppIcon from '../ui/AppIcon';
import './CommandPalette.css';

/**
 * CommandPalette — Ctrl/Cmd+K quick switcher dialog.
 */
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSelectSubject,
  onSelectPaper,
  onExecuteAction,
  isLoggedIn = false
}) {
  const prefersReduced = usePrefersReducedMotion();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [papers, setPapers] = useState([]);
  const hasLoadedCatalog = useRef(false);
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const panelVariants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.98 } };

  useEffect(() => {
    if (!isOpen || hasLoadedCatalog.current) return undefined;
    let active = true;
    hasLoadedCatalog.current = true;
    Promise.all([
      fetchSubjectsFromSupabase().catch(() => DEFAULT_SUBJECTS),
      fetchAllPapersFromSupabase().catch(() => [])
    ]).then(([loadedSubjects, loadedPapers]) => {
      if (!active) return;
      if (Array.isArray(loadedSubjects) && loadedSubjects.length > 0) {
        setSubjects(loadedSubjects);
      }
      if (Array.isArray(loadedPapers)) {
        setPapers(loadedPapers);
      }
    });
    return () => { active = false; };
  }, [isOpen]);

  const results = useMemo(() => {
    return getCommandPaletteResults(query, { isLoggedIn, subjects, papers });
  }, [query, isLoggedIn, subjects, papers]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    document.body.style.overflow = '';
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector('.cmd-palette__item--selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'instant' : 'smooth' });
    }
  }, [selectedIndex, prefersReduced]);

  const handleSelect = (item) => {
    onClose();
    if (item.actionId) {
      onExecuteAction(item.actionId);
    } else if (item.paper && typeof onSelectPaper === 'function') {
      onSelectPaper(item.paper);
    } else if (item.subject && typeof onSelectSubject === 'function') {
      onSelectSubject(item.subject);
    } else if (item.path) {
      onNavigate(item.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(results.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(e.key)) {
      inputRef.current?.focus();
    }
  };

  const groupedResults = useMemo(() => {
    const groups = [];
    let flatIdx = 0;
    results.forEach((item) => {
      let groupObj = groups.find((g) => g.name === item.group);
      if (!groupObj) {
        groupObj = { name: item.group, items: [] };
        groups.push(groupObj);
      }
      groupObj.items.push({ ...item, flatIndex: flatIdx });
      flatIdx++;
    });
    return groups;
  }, [results]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cmd-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="cmd-palette-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Input Row */}
            <div className="cmd-palette__input-row">
              <AppIcon name="search" className="cmd-palette__search-icon" size={20} />
              <input
                ref={inputRef}
                type="text"
                spellCheck={false}
                autoComplete="off"
                className="cmd-palette__input"
                placeholder="Search course codes (CSC211), teachers, Midterm, Terminal…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search courses, papers, teachers, and pages"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls={`${listId}-results`}
                aria-activedescendant={results[selectedIndex] ? `${listId}-option-${selectedIndex}` : undefined}
              />
            </div>

            {/* Results List */}
            <div className="cmd-palette__list" ref={listRef} id={`${listId}-results`} role="listbox" aria-label="Search results">
              {results.length === 0 ? (
                <div className="cmd-palette__empty">
                  <div className="cmd-palette__empty-icon">
                    <AppIcon name="search_off" size={28} />
                  </div>
                  <p className="cmd-palette__empty-text">No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                groupedResults.map((group) => (
                  <div key={group.name} className="cmd-palette__group" role="group" aria-label={group.name}>
                    <div className="cmd-palette__group-title">{group.name}</div>
                    {group.items.map((item) => {
                      const isSelected = item.flatIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          id={`${listId}-option-${item.flatIndex}`}
                          aria-selected={isSelected}
                          tabIndex={-1}
                          className={`cmd-palette__item ${isSelected ? 'cmd-palette__item--selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                        >
                          <AppIcon name={item.icon} className="cmd-palette__item-icon" size={18} />
                          <span className="cmd-palette__item-text">
                            <span className="cmd-palette__item-label" translate={item.subjectCode ? 'no' : undefined}>
                              {item.label}
                            </span>
                            {item.meta && (
                              <span className="cmd-palette__item-meta">{item.meta}</span>
                            )}
                          </span>
                          {isSelected && (
                            <AppIcon name="keyboard_return" className="cmd-palette__enter-icon" size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer Hint Row */}
            <div className="cmd-palette__footer">
              <div className="cmd-palette__hint">
                <kbd className="cmd-palette__kbd">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="cmd-palette__hint">
                <kbd className="cmd-palette__kbd">↵</kbd>
                <span>Open</span>
              </div>
              <div className="cmd-palette__hint">
                <kbd className="cmd-palette__kbd">esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
