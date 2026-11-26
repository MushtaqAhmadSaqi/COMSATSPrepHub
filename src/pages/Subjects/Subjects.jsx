import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase, fetchAllPapersFromSupabase } from '../../services/papersService';
import { DEPARTMENTS } from '../../constants/subjects';
import { normalizeCourseCode, getPaperFacets, filterPapers } from '../../utils/paperSearch';
import { SubjectCardSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/PageHeader/PageHeader';
import AppIcon from '../../components/ui/AppIcon';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2) }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div className="subject-code mono-code" translate="no">{subject.code}</div>
        <span style={{ color: 'var(--brand)', opacity: 0.8 }}>
          <AppIcon name={subject.icon || 'menu_book'} size={20} />
        </span>
      </div>
      <div className="subject-name">{highlightMatch(subject.name, searchQuery)}</div>
      <div className="subject-meta">
        <span>{subject.department}</span>
        <span className="subject-papers-count tabular-nums">
          <AppIcon name="description" size={16} />
          {subject.papers} Papers
        </span>
      </div>
    </motion.button>
  );
}

/* ── Animated Department Chip ── */
function DepartmentChip({ dept, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`department-chip ${isSelected ? 'selected' : ''}`}
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
        transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
        boxShadow: isSelected ? 'var(--shadow-brand)' : 'none'
      }}
    >
      {dept}
    </button>
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
        <span className="subject-code mono-code" translate="no">{paper.subjectCode || 'Paper'}</span>
        {paper.isSample && <span className="paper-sample-badge">Sample</span>}
        <AppIcon name="arrow_forward" className="paper-result-arrow" size={18} />
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

function readInitialFilters() {
  const defaults = { q: '', dept: 'All', examType: 'All', department: 'All', semester: 'All', year: 'All' };
  if (typeof window === 'undefined') return defaults;
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return defaults;
  try {
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    return {
      q: params.get('q') || '',
      dept: params.get('dept') || 'All',
      examType: params.get('exam') || 'All',
      department: params.get('pdept') || 'All',
      semester: params.get('sem') || 'All',
      year: params.get('year') || 'All'
    };
  } catch {
    return defaults;
  }
}

const EMPTY_PAPER_FILTERS = { examType: 'All', department: 'All', semester: 'All', year: 'All' };
const PAPERS_PAGE_SIZE = 12;

export default function Subjects({ onSelectSubject = () => {}, onViewPaper = () => {} }) {
  const initialState = useMemo(readInitialFilters, []);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(initialState.q);
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialState.q.trim());
  const [selectedDept, setSelectedDept] = useState(initialState.dept);

  const [allPapers, setAllPapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState(null);
  const [papersLoaded, setPapersLoaded] = useState(false);
  const [paperFilters, setPaperFilters] = useState({
    examType: initialState.examType,
    department: initialState.department,
    semester: initialState.semester,
    year: initialState.year
  });
  const [visiblePapers, setVisiblePapers] = useState(PAPERS_PAGE_SIZE);

  // 180ms search debounce for smooth typing on mobile devices
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync active filters to shareable hash query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedDept !== 'All') params.set('dept', selectedDept);
    if (paperFilters.examType !== 'All') params.set('exam', paperFilters.examType);
    if (paperFilters.department !== 'All') params.set('pdept', paperFilters.department);
    if (paperFilters.semester !== 'All') params.set('sem', paperFilters.semester);
    if (paperFilters.year !== 'All') params.set('year', paperFilters.year);
    const qs = params.toString();
    window.history.replaceState({ path: 'subjects' }, '', `#subjects${qs ? `?${qs}` : ''}`);
  }, [debouncedQuery, selectedDept, paperFilters]);

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

  const activePaperFilters = Object.entries(paperFilters).filter(([, value]) => value !== 'All');
  const hasPaperFilters = activePaperFilters.length > 0;
  const shouldShowPaperResults = debouncedQuery.length > 0 || hasPaperFilters;

  // Load the full paper library once a search or paper facet filter is active
  useEffect(() => {
    if (shouldShowPaperResults && !papersLoaded && !papersLoading) {
      loadAllPapers();
    }
  }, [shouldShowPaperResults, papersLoaded, papersLoading]);

  useEffect(() => {
    setVisiblePapers(PAPERS_PAGE_SIZE);
  }, [debouncedQuery, paperFilters]);

  const facets = useMemo(() => getPaperFacets(allPapers), [allPapers]);

  const paperResults = useMemo(() => {
    if (!shouldShowPaperResults) return [];
    return filterPapers(allPapers, { query: debouncedQuery, ...paperFilters });
  }, [allPapers, shouldShowPaperResults, debouncedQuery, paperFilters]);

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
      transition={{ duration: 0.25 }}
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
          <input
            id="subject-search"
            type="search"
            spellCheck={false}
            autoComplete="off"
            className="subjects-search-bar"
            placeholder='Try "CSC211", "Calculus", or a teacher name'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search subjects and past papers"
          />
          {searchQuery && (
            <button
              type="button"
              className="subjects-search-clear-btn"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <AppIcon name="close" size={18} />
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
                <AppIcon name="close" size={16} />
              </button>
            )}
            {hasActiveFilters && (
              <button type="button" className="active-filter-chip" onClick={() => setSelectedDept('All')}>
                Subject department: {selectedDept}
                <AppIcon name="close" size={16} />
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
                <AppIcon name="close" size={16} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Global past-paper results (while searching or facet filtering) ── */}
      {shouldShowPaperResults && (
        <section className="paper-results-panel" aria-label="Past paper search results">
          <div className="paper-results-heading">
            <h2 className="paper-results-title">
              <AppIcon name="description" size={20} />
              Past papers
            </h2>
            <p className="subjects-result-count tabular-nums" aria-live="polite">
              {papersLoading
                ? 'Searching the paper library…'
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
                  <AppIcon name="info" size={16} />
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
      {shouldShowPaperResults && <h2 className="subjects-section-title">Matching subjects</h2>}
      <p className="subjects-result-count subjects-catalog-count tabular-nums" aria-live="polite">
        {loading
          ? 'Loading subjects…'
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
