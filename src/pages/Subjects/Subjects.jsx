import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { DEFAULT_SUBJECTS, DEPARTMENTS } from '../../constants/subjects';
import { SkeletonCard, SubjectCardSkeleton } from '../../components/ui/Skeleton';
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

/* ── Spotlight Card with Glow Effect ── */
function SpotlightSubjectCard({ subject, idx, searchQuery = '', onSelect }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.button
      ref={cardRef}
      type="button"
      className="subject-card spotlight-subject"
      onClick={() => onSelect(subject)}
      aria-label={`Browse ${subject.name} papers`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.04 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      }}
    >
      {isHovered && (
        <motion.div
          className="spotlight-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
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
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
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
      className={`department-chip ${isSelected ? 'selected' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '0.4rem 1rem',
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
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const loadSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbSubjects = await fetchSubjectsFromSupabase();
      if (dbSubjects && dbSubjects.length > 0) {
        setSubjects(dbSubjects);
      }
    } catch (err) {
      setError(err.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filtered = subjects.filter(s => {
    const matchesDept = selectedDept === 'All' || s.department === selectedDept;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesQuery;
  });

  const hasActiveFilters = selectedDept !== 'All';
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <motion.div
      className="subjects-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        badge="Library"
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
            placeholder="Search by name, code (e.g. CSC211), or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search subjects"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileFocus={{ scale: 1.01 }}
          />
          {hasSearch && (
            <button
              type="button"
              className="subjects-search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
            </button>
          )}
        </div>

        <div className="subjects-filter-row">
          <div className="subjects-filter-chips" aria-label="Filter by department">
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
              <button type="button" className="active-filter-chip" onClick={() => setSearchQuery('')}>
                Search: "{searchQuery}"
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        )}

        <p className="subjects-result-count" aria-live="polite">
          {loading ? 'Loading subjects...' : filtered.length === 0 && hasSearch ? `No subjects match "${searchQuery}"` : `${filtered.length} ${filtered.length === 1 ? 'subject' : 'subjects'}`}
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
        />
      ) : (
        <motion.div
          className="subjects-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <AnimatePresence>
            {filtered.map((subj, idx) => (
              <SpotlightSubjectCard
                key={subj.code}
                subject={subj}
                idx={idx}
                searchQuery={searchQuery}
                onSelect={onSelectSubject}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
