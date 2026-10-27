import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fetchPapersForSubjectFromSupabase } from '../../services/papersService';
import { isPaperBookmarked, togglePaperBookmark } from '../../utils/studyTracker';
import { useToast } from '../../utils/toast';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import './SubjectPapers.css';

const EXAM_TYPES = ['All', 'Terminal', 'Midterm', 'Quiz'];
const SEMESTERS = ['All', 'Spring', 'Fall'];

export default function SubjectPapers({
  subject = { name: 'Data Structures & Algorithms', code: 'CSC211' },
  onViewPaper = () => {},
  onBack = () => {},
  onNavigate
}) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters, search, sorting & pagination
  const [examFilter, setExamFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const [, setBookmarkTick] = useState(0);

  const toast = useToast();

  const loadPapers = () => {
    setReloadKey((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPapers([]);

      try {
        const rows = await fetchPapersForSubjectFromSupabase(
          subject.code,
          subject.name
        );

        if (!Array.isArray(rows)) {
          throw new Error('The paper service returned an invalid response.');
        }

        if (!cancelled) {
          setPapers(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load papers.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [subject.code, subject.name, reloadKey]);

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(papers.map((p) => String(p.year || '')).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a));
    return ['All', ...years];
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = papers.filter((paper) => {
      const term = String(paper.term || '').toLowerCase();
      const sem = String(paper.semester || '').toLowerCase();
      const yr = String(paper.year || '');
      const title = String(paper.title || '').toLowerCase();

      if (examFilter !== 'All' && !term.includes(examFilter.toLowerCase())) {
        return false;
      }
      if (semesterFilter !== 'All' && !sem.includes(semesterFilter.toLowerCase())) {
        return false;
      }
      if (yearFilter !== 'All' && yr !== yearFilter) {
        return false;
      }
      if (q && !title.includes(q) && !term.includes(q) && !sem.includes(q)) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'oldest') return Number(a.year || 0) - Number(b.year || 0);
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      return Number(b.year || 0) - Number(a.year || 0);
    });
  }, [papers, examFilter, semesterFilter, yearFilter, sortBy, searchText]);

  const visiblePapers = filteredPapers.slice(0, visibleCount);

  const breadcrumbItems = [
    { label: 'Subjects', onClick: onBack },
    { label: subject.name }
  ];

  const handleUploadRedirect = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('upload');
    } else {
      window.location.hash = 'upload';
    }
  };

  const handleToggleBookmark = (e, paper) => {
    e.stopPropagation();
    const res = togglePaperBookmark(paper);
    setBookmarkTick((t) => t + 1);
    toast.info(res.bookmarked ? 'Paper saved to bookmarks!' : 'Removed from bookmarks.');
  };

  return (
    <motion.div
      className="papers-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Breadcrumbs items={breadcrumbItems} />

      <header className="papers-intro">
        <div className="papers-eyebrow">
          <span className="material-symbols-outlined" aria-hidden="true">
            library_books
          </span>
          Past paper library
        </div>

        <PageHeader
          title={subject.name}
          subtitle={`${subject.code} · ${subject.department || 'COMSATS Course'}`}
        />

        <p className="papers-intro-description">
          Browse previous examinations, filter by midterm or terminal session, bookmark papers for revision, or open a paper to study its model answers and generate a custom quiz.
        </p>
      </header>

      {/* Filters, Search & Sort Controls */}
      <section
        aria-label="Filter and sort past papers"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.125rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end'
        }}
      >
        <div>
          <label htmlFor="paper-search-input" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>
            Search paper
          </label>
          <input
            id="paper-search-input"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="e.g. Spring 2024…"
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label htmlFor="paper-exam-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>
            Exam Type
          </label>
          <select
            id="paper-exam-filter"
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem'
            }}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paper-semester-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>
            Semester
          </label>
          <select
            id="paper-semester-filter"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem'
            }}
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paper-year-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>
            Year
          </label>
          <select
            id="paper-year-filter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem'
            }}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paper-sort-select" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>
            Sort By
          </label>
          <select
            id="paper-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem'
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
      </section>

      <div className="papers-section-heading">
        <h2>Available papers</h2>

        {!loading && !error && (
          <span className="papers-count" role="status">
            {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}
          </span>
        )}
      </div>

      {loading ? (
        <div
          className="papers-list"
          aria-busy="true"
          aria-label="Loading papers"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="papers-skeleton-card" key={index}>
              <SkeletonListItem />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPapers} />
      ) : filteredPapers.length === 0 ? (
        <EmptyState
          icon="find_in_page"
          title={`No matching papers found for ${subject.code}`}
          description="Try clearing filters or contribute/request a past paper for this course."
          actionLabel="Upload or Request Paper"
          onAction={handleUploadRedirect}
        />
      ) : (
        <>
          <div className="papers-list">
            {visiblePapers.map((paper) => {
              const bookmarked = isPaperBookmarked(paper.id);
              return (
                <div
                  key={paper.id}
                  className="paper-item-card"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <button
                    type="button"
                    onClick={() => onViewPaper(paper)}
                    aria-label={`View ${paper.title}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      color: 'inherit',
                      minWidth: 0
                    }}
                  >
                    <span className="paper-item-icon" aria-hidden="true">
                      <span className="material-symbols-outlined">description</span>
                    </span>

                    <span className="paper-item-copy" style={{ flex: 1, minWidth: 0 }}>
                      <span className="paper-title">{paper.title}</span>

                      <span className="paper-item-meta">
                        <span className="paper-badge">{paper.term || 'Exam'}</span>

                        {paper.year && (
                          <span className="paper-meta-detail">
                            <span className="material-symbols-outlined" aria-hidden="true">
                              calendar_month
                            </span>
                            {paper.year}
                          </span>
                        )}

                        {paper.semester && (
                          <span className="paper-meta-detail">{paper.semester}</span>
                        )}

                        {paper.totalMarks && (
                          <span className="paper-meta-detail">{paper.totalMarks} Marks</span>
                        )}
                      </span>
                    </span>

                    <span className="btn-view-paper">
                      View paper
                      <span className="material-symbols-outlined" aria-hidden="true">
                        arrow_forward
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleToggleBookmark(e, paper)}
                    aria-label={bookmarked ? `Remove ${paper.title} from bookmarks` : `Bookmark ${paper.title}`}
                    aria-pressed={bookmarked}
                    title={bookmarked ? 'Bookmarked' : 'Save paper'}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      background: bookmarked ? 'var(--brand-soft)' : 'var(--surface-2)',
                      color: bookmarked ? 'var(--brand)' : 'var(--text-subtle)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">
                      {bookmarked ? 'bookmark_added' : 'bookmark_add'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {filteredPapers.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 8)}
                style={{
                  padding: '0.7rem 1.5rem',
                  borderRadius: '9999px',
                  border: '1.5px solid var(--border-strong)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontWeight: 700,
                  minHeight: '44px'
                }}
              >
                Load More Papers ({filteredPapers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
