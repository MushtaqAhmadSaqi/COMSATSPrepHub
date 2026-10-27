import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { DEPARTMENTS } from '../../constants/subjects';
import { SubjectCardSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/PageHeader/PageHeader';
import './Subjects.css';

/* ── Highlight Matched Substring ── */
function highlightMatch(text, query) {
  if (!query || !query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="subject-match-mark">{part}</mark>
    ) : (
      part
    )
  );
}

/* ── Subject Card ── */
function SubjectCard({ subject, idx, searchQuery = '', onSelect }) {
  return (
    <motion.button
      type="button"
      className="subject-card"
      onClick={() => onSelect(subject)}
      aria-label={`Browse ${subject.name} papers`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div className="subject-code">{subject.code}</div>
        <span
          className="material-symbols-outlined"
          style={{ color: 'var(--brand)', opacity: 0.7, fontSize: '20px' }}
          aria-hidden="true"
        >
          {subject.icon || 'menu_book'}
        </span>
      </div>
      <div className="subject-name">{highlightMatch(subject.name, searchQuery)}</div>
      <div className="subject-meta">
        <span>{subject.department}</span>
        <span className="subject-papers-count">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">description</span>
          {subject.papers} Papers
        </span>
      </div>
    </motion.button>
  );
}

/* ── Animated Department Chip ── */
function DepartmentChip({ dept, isSelected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`department-chip ${isSelected ? 'selected' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: '0.45rem 1rem',
        minHeight: '40px',
        borderRadius: '9999px',
        border: '1.5px solid var(--border)',
        background: isSelected ? 'var(--brand)' : 'var(--surface)',
        color: isSelected ? '#ffffff' : 'var(--text-muted)',
        fontWeight: 700,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? 'var(--shadow-brand)' : 'none'
      }}
    >
      {dept}
    </motion.button>
  );
}

export default function Subjects({ onSelectSubject = () => {} }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // 180ms search debounce for smooth typing on mobile devices
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbSubjects = await fetchSubjectsFromSupabase();
      setSubjects(dbSubjects || []);
    } catch (err) {
      setError(err.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filtered = subjects.filter((s) => {
    const matchesDept = selectedDept === 'All' || s.department === selectedDept;
    const q = debouncedQuery.toLowerCase();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  const hasActiveFilters = selectedDept !== 'All';
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <motion.div
      className="subjects-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        badge="Live catalog"
        title="Browse All Subjects"
        subtitle="Select a subject to view past examination papers, quizzes, and solutions."
      />

      {/* Filter tabs and search */}
      <div className="subjects-filter-panel">
        <label className="subjects-search-label" htmlFor="subject-search">
          Find a subject
        </label>
        <div className="subjects-search-wrapper">
          <motion.input
            id="subject-search"
            type="text"
            className="subjects-search-bar"
            placeholder="Search subjects by name or code (e.g. CSC211)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search subjects"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          />
          {hasSearch && (
            <button
              type="button"
              className="subjects-search-clear-btn"
              onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">close</span>
            </button>
          )}
        </div>

        <div className="subjects-filter-row">
          <div className="subjects-filter-chips" role="group" aria-label="Filter by department">
            {DEPARTMENTS.map((dept) => (
              <DepartmentChip
                key={dept}
                dept={dept}
                isSelected={selectedDept === dept}
                onClick={() => setSelectedDept(dept)}
              />
            ))}
          </div>
          {hasActiveFilters && (
            <button type="button" className="clear-filters-btn" onClick={() => setSelectedDept('All')}>
              Clear filters
            </button>
          )}
        </div>

        {(hasActiveFilters || hasSearch) && (
          <div className="active-filter-row" aria-label="Active filters">
            <span className="active-filter-label">Active:</span>
            {hasActiveFilters && (
              <button type="button" className="active-filter-chip" onClick={() => setSelectedDept('All')}>
                Department: {selectedDept}
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
            {hasSearch && (
              <button type="button" className="active-filter-chip" onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}>
                Search: &ldquo;{searchQuery}&rdquo;
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        )}

        <p className="subjects-result-count" aria-live="polite">
          {loading
            ? 'Loading subjects...'
            : filtered.length === 0 && hasSearch
              ? `No subjects match "${searchQuery}"`
              : `${filtered.length} ${filtered.length === 1 ? 'subject' : 'subjects'}`}
        </p>
      </div>

      {loading ? (
        <div className="subjects-grid" aria-busy="true" aria-label="Loading subjects">
          {Array.from({ length: typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 8 }).map((_, i) => (
            <SubjectCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadSubjects} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No subjects match your filter"
          description='Try selecting "All" or typing a different keyword'
          actionLabel="Reset Filters"
          onAction={() => {
            setSelectedDept('All');
            setSearchQuery('');
            setDebouncedQuery('');
          }}
        />
      ) : (
        <motion.div
          className="subjects-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <AnimatePresence>
            {filtered.map((subj, idx) => (
              <SubjectCard
                key={subj.code}
                subject={subj}
                idx={idx}
                searchQuery={debouncedQuery}
                onSelect={onSelectSubject}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
