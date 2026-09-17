import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCommandPaletteResults } from '../../utils/fuzzySearch';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';
import './CommandPalette.css';

/**
 * CommandPalette — Ctrl/Cmd+K quick switcher dialog.
 */
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onExecuteAction,
  isLoggedIn = false
}) {
  const prefersReduced = usePrefersReducedMotion();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const listRef = useRef(null);

  const panelVariants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.98 } };

  // Compute search results based on query and auth state
  const results = useMemo(() => {
    return getCommandPaletteResults(query, { isLoggedIn });
  }, [query, isLoggedIn]);

  // Reset index when query changes or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  // Handle open / close side-effects (body scroll lock, focus trap store/restore)
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setQuery('');
      setSelectedIndex(0);
      // Focus input after transition
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector('.cmd-palette__item--selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleSelect = (item) => {
    onClose();
    if (item.actionId) {
      onExecuteAction(item.actionId);
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

    if (results.length === 0) return;

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
      // Focus trap for Tab key inside input/dialog
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    }
  };

  // Group results for rendering with section headers
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
              <span className="material-symbols-outlined cmd-palette__search-icon" aria-hidden="true">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                className="cmd-palette__input"
                placeholder="Search pages, subjects, actions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search pages, subjects, actions"
              />
            </div>

            {/* Results List */}
            <div className="cmd-palette__list" ref={listRef}>
              {results.length === 0 ? (
                <div className="cmd-palette__empty">
                  <span className="material-symbols-outlined cmd-palette__empty-icon" aria-hidden="true">
                    search_off
                  </span>
                  <p className="cmd-palette__empty-text">No results for "{query}"</p>
                </div>
              ) : (
                groupedResults.map((group) => (
                  <div key={group.name} className="cmd-palette__group">
                    <div className="cmd-palette__group-title">{group.name}</div>
                    {group.items.map((item) => {
                      const isSelected = item.flatIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`cmd-palette__item ${isSelected ? 'cmd-palette__item--selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                        >
                          <span className="material-symbols-outlined cmd-palette__item-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span className="cmd-palette__item-label">{item.label}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined cmd-palette__enter-icon" aria-hidden="true">
                              keyboard_return
                            </span>
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
