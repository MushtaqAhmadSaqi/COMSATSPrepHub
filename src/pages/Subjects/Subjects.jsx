import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase, fetchAllPapersFromSupabase } from '../../services/papersService';
import { DEPARTMENTS } from '../../constants/subjects';
import { normalizeCourseCode, getPaperFacets, filterPapers } from '../../utils/paperSearch';
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
        minHeight: '44px',
        borderRadius: '9999px',
        border: '1.5px solid var(--border)',
        background: isSelected ? 'var(--brand)' : 'var(--surface)',
        color: isSelected ? 'var(--on-brand)' : 'var(--text-muted)',
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

/* ── Global Paper Result Card ── */
function PaperResultCard({ paper, onOpen }) {
  const metaBits = [
    paper.term,
    paper.year ? String(paper.year) : null,
    paper.semester || null,
    paper.instructorName || null
  ].filter(Boolean);
  return (
    <button
      type="button"
      className="paper-result-card"
      onClick={() => onOpen(paper)}
      aria-label={`Open ${paper.title}`}
    >
      <div className="paper-result-top">
        <span className="subject-code">{paper.subjectCode || 'Paper'}</span>
        {paper.isSample && <span className="paper-sample-badge">Sample</span>}
        <span className="material-symbols-outlined paper-result-arrow" aria-hidden="true">arrow_forward</span>
      </div>
      <div className="paper-result-title">{paper.title}</div>
      <div className="paper-result-meta">{metaBits.join(' · ') || 'Past paper'}</div>
    </button>
  );
}

/* ── Facet Select ── */
function FacetSelect({ id, label, value, options, onChange }) {
  return (
    <div className="paper-facet-field">
      <label className="paper-facet-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="paper-facet-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function readInitialQuery() {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return '';
  try {
    return new URLSearchParams(hash.slice(queryIndex + 1)).get('q') || '';
  } catch {
    return '';
  }
}

const EMPTY_PAPER_FILTERS = { examType: 'All', department: 'All', semester: 'All', year: 'All' };
const PAPERS_PAGE_SIZE = 12;

export default function Subjects({ onSelectSubject = () => {}, onViewPaper = () => {} }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(readInitialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(() => readInitialQuery().trim());
  const [selectedDept, setSelectedDept] = useState('All');

  const [allPapers, setAllPapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState(null);
  const [papersLoaded, setPapersLoaded] = useState(false);
  const [paperFilters, setPaperFilters] = useState(EMPTY_PAPER_FILTERS);
  const [visiblePapers, setVisiblePapers] = useState(PAPERS_PAGE_SIZE);

  // 180ms search debounce for smooth typing on mobile devices
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keep the shareable ?q= in the URL without adding history entries
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const suffix = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : '';
    window.history.replaceState({ path: 'subjects' }, '', `#subjects${suffix}`);
  }, [debouncedQuery]);

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

  const loadAllPapers = async () => {
    setPapersLoading(true);
    setPapersError(null);
    try {
      const papers = await fetchAllPapersFromSupabase();
      setAllPapers(papers || []);
      setPapersLoaded(true);
    } catch (err) {
      setPapersError(err.message || 'Failed to load papers.');
    } finally {
      setPapersLoading(false);
    }
  };

  // Load the full paper library once, the first time a search is active
  useEffect(() => {
    if (debouncedQuery && !papersLoaded && !papersLoading) {
      loadAllPapers();
    }
  }, [debouncedQuery, papersLoaded, papersLoading]);

  useEffect(() => {
    setVisiblePapers(PAPERS_PAGE_SIZE);
  }, [debouncedQuery, paperFilters]);

  const facets = useMemo(() => getPaperFacets(allPapers), [allPapers]);

  const paperResults = useMemo(() => {
    if (!debouncedQuery) return [];
    return filterPapers(allPapers, { query: debouncedQuery, ...paperFilters });
  }, [allPapers, debouncedQuery, paperFilters]);

  const filtered = subjects.filter((s) => {
    const matchesDept = selectedDept === 'All' || s.department === selectedDept;
    const q = debouncedQuery.toLowerCase();
    const normalized = normalizeCourseCode(debouncedQuery);
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (normalized && normalizeCourseCode(s.code).includes(normalized)) ||
      s.department.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  const hasActiveFilters = selectedDept !== 'All';
  const hasSearch = debouncedQuery.length > 0;
  const activePaperFilters = Object.entries(paperFilters).filter(([, value]) => value !== 'All');
  const hasPaperFilters = activePaperFilters.length > 0;
  const showingSamples = paperResults.some((paper) => paper.isSample);

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setPaperFilters(EMPTY_PAPER_FILTERS);
  };

  const clearEverything = () => {
    clearSearch();
    setSelectedDept('All');
  };

  const paperFilterLabels = {
    examType: 'Exam type',
    department: 'Department',
    semester: 'Semester',
    year: 'Year'
  };

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
        subtitle="Search every past paper by course code, title, or teacher — or pick a subject to browse its full library."
      />

      {/* Filter tabs and search */}
      <div className="subjects-filter-panel">
        <label className="subjects-search-label" htmlFor="subject-search">
          Search subjects &amp; past papers
        </label>
        <div className="subjects-search-wrapper">
          <motion.input
            id="subject-search"
            type="search"
            className="subjects-search-bar"
            placeholder='Try "csc 103", "Calculus", or a teacher name'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search subjects and past papers"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          />
          {searchQuery && (
            <button
              type="button"
              className="subjects-search-clear-btn"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">close</span>
            </button>
          )}
        </div>

        <div className="subjects-filter-row">
          <div className="subjects-filter-chips" role="group" aria-label="Filter subjects by department">
            {DEPARTMENTS.map((dept) => (
              <DepartmentChip
                key={dept}
                dept={dept}
                isSelected={selectedDept === dept}
                onClick={() => setSelectedDept(dept)}
              />
            ))}
          </div>
          {(hasActiveFilters || hasSearch || hasPaperFilters) && (
            <button type="button" className="clear-filters-btn" onClick={clearEverything}>
              Clear all
            </button>
          )}
        </div>

        {(hasActiveFilters || hasSearch || hasPaperFilters) && (
          <div className="active-filter-row" aria-label="Active filters">
            <span className="active-filter-label">Active:</span>
            {hasSearch && (
              <button type="button" className="active-filter-chip" onClick={clearSearch}>
                Search: &ldquo;{debouncedQuery}&rdquo;
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
            {hasActiveFilters && (
              <button type="button" className="active-filter-chip" onClick={() => setSelectedDept('All')}>
                Subject department: {selectedDept}
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
            {activePaperFilters.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="active-filter-chip"
                onClick={() => setPaperFilters((prev) => ({ ...prev, [key]: 'All' }))}
              >
                {paperFilterLabels[key]}: {value}
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Global past-paper results (only while searching) ── */}
      {hasSearch && (
        <section className="paper-results-panel" aria-label="Past paper search results">
          <div className="paper-results-heading">
            <h2 className="paper-results-title">
              <span className="material-symbols-outlined" aria-hidden="true">description</span>
              Past papers
            </h2>
            <p className="subjects-result-count" aria-live="polite">
              {papersLoading
                ? 'Searching the paper library...'
                : papersError
                  ? 'Paper search unavailable'
                  : `${paperResults.length} ${paperResults.length === 1 ? 'paper' : 'papers'} found`}
            </p>
          </div>

          {papersLoading ? (
            <div className="paper-results-grid" aria-busy="true" aria-label="Loading papers">
              {Array.from({ length: 4 }).map((_, i) => (
                <SubjectCardSkeleton key={i} />
              ))}
            </div>
          ) : papersError ? (
            <ErrorState message={papersError} onRetry={loadAllPapers} />
          ) : paperResults.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No papers match this search"
              description="Try a course code like CSC211, remove a filter, or check the spelling."
              actionLabel="Clear filters"
              onAction={() => setPaperFilters(EMPTY_PAPER_FILTERS)}
            />
          ) : (
            <>
              <div className="paper-facet-selects" role="group" aria-label="Filter paper results">
                <FacetSelect
                  id="paper-facet-exam"
                  label="Exam type"
                  value={paperFilters.examType}
                  options={facets.examTypes}
                  onChange={(value) => setPaperFilters((prev) => ({ ...prev, examType: value }))}
                />
                <FacetSelect
                  id="paper-facet-dept"
                  label="Department"
                  value={paperFilters.department}
                  options={facets.departments}
                  onChange={(value) => setPaperFilters((prev) => ({ ...prev, department: value }))}
                />
                <FacetSelect
                  id="paper-facet-sem"
                  label="Semester"
                  value={paperFilters.semester}
                  options={facets.semesters}
                  onChange={(value) => setPaperFilters((prev) => ({ ...prev, semester: value }))}
                />
                <FacetSelect
                  id="paper-facet-year"
                  label="Year"
                  value={paperFilters.year}
                  options={facets.years.map(String)}
                  onChange={(value) => setPaperFilters((prev) => ({ ...prev, year: value }))}
                />
              </div>

              {showingSamples && (
                <p className="paper-sample-note">
                  <span className="material-symbols-outlined" aria-hidden="true">info</span>
                  Sample practice sets are shown when the live library is unavailable. They are clearly labelled and never imitate a real exam.
                </p>
              )}

              <div className="paper-results-grid">
                {paperResults.slice(0, visiblePapers).map((paper) => (
                  <PaperResultCard key={paper.id} paper={paper} onOpen={onViewPaper} />
                ))}
              </div>

              {paperResults.length > visiblePapers && (
                <button
                  type="button"
                  className="paper-results-more"
                  onClick={() => setVisiblePapers((count) => count + PAPERS_PAGE_SIZE)}
                >
                  Show more papers ({paperResults.length - visiblePapers} remaining)
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Subject catalog ── */}
      {hasSearch && <h2 className="subjects-section-title">Matching subjects</h2>}
      <p className="subjects-result-count subjects-catalog-count" aria-live="polite">
        {loading
          ? 'Loading subjects...'
          : filtered.length === 0 && hasSearch
            ? `No subjects match "${debouncedQuery}"`
            : `${filtered.length} ${filtered.length === 1 ? 'subject' : 'subjects'}`}
      </p>

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
          onAction={clearEverything}
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