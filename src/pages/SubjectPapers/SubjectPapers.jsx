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
import AppIcon from '../../components/ui/AppIcon';
import './SubjectPapers.css';

function readInitialSubjectFilters() {
  const defaults = { exam: 'All', sem: 'All', year: 'All', teacher: 'All', sort: 'newest', q: '' };
  if (typeof window === 'undefined') return defaults;
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx === -1) return defaults;
  try {
    const p = new URLSearchParams(hash.slice(idx + 1));
    return {
      exam: p.get('exam') || 'All',
      sem: p.get('sem') || 'All',
      year: p.get('year') || 'All',
      teacher: p.get('teacher') || 'All',
      sort: p.get('sort') || 'newest',
      q: p.get('q') || ''
    };
  } catch {
    return defaults;
  }
}

export default function SubjectPapers({
  subject = { name: 'Data Structures & Algorithms', code: 'CSC211' },
  onViewPaper = () => {},
  onBack = () => {},
  onNavigate
}) {
  const initialFilters = useMemo(readInitialSubjectFilters, []);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters, search, sorting & pagination
  const [examFilter, setExamFilter] = useState(initialFilters.exam);
  const [semesterFilter, setSemesterFilter] = useState(initialFilters.sem);
  const [yearFilter, setYearFilter] = useState(initialFilters.year);
  const [teacherFilter, setTeacherFilter] = useState(initialFilters.teacher);
  const [sortBy, setSortBy] = useState(initialFilters.sort);
  const [searchText, setSearchText] = useState(initialFilters.q);
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

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const idx = hash.indexOf('?');
    const hashCode = idx !== -1 ? new URLSearchParams(hash.slice(idx + 1)).get('code') : '';
    if (hashCode && subject?.code && hashCode.toLowerCase() !== subject.code.toLowerCase()) {
      setExamFilter('All');
      setSemesterFilter('All');
      setYearFilter('All');
      setTeacherFilter('All');
      setSearchText('');
      setVisibleCount(8);
    }
  }, [subject.code]);

  // Sync subject filter controls into URL query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (subject?.code) params.set('code', subject.code);
    if (examFilter !== 'All') params.set('exam', examFilter);
    if (semesterFilter !== 'All') params.set('sem', semesterFilter);
    if (yearFilter !== 'All') params.set('year', yearFilter);
    if (teacherFilter !== 'All') params.set('teacher', teacherFilter);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (searchText.trim()) params.set('q', searchText.trim());
    const qs = params.toString();
    window.history.replaceState({ path: 'subject-papers', code: subject?.code }, '', `#subject-papers${qs ? `?${qs}` : ''}`);
  }, [subject?.code, examFilter, semesterFilter, yearFilter, teacherFilter, sortBy, searchText]);

  const availableExamTypes = useMemo(() => {
    const terms = Array.from(
      new Set(papers.map((p) => String(p.term || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return ['All', ...terms];
  }, [papers]);

  const availableSemesters = useMemo(() => {
    const seasons = ['Spring', 'Fall', 'Summer'].filter((season) =>
      papers.some((p) => String(p.semester || '').toLowerCase().includes(season.toLowerCase()))
    );
    return ['All', ...seasons];
  }, [papers]);

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(papers.map((p) => String(p.year || '')).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a));
    return ['All', ...years];
  }, [papers]);

  const availableTeachers = useMemo(() => {
    const teachers = Array.from(
      new Set(papers.map((p) => String(p.instructorName || p.teacher || '')).filter(Boolean))
    ).sort();
    return ['All', ...teachers];
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = papers.filter((paper) => {
      const term = String(paper.term || '').toLowerCase();
      const sem = String(paper.semester || '').toLowerCase();
      const yr = String(paper.year || '');
      const title = String(paper.title || '').toLowerCase();
      const teacher = String(paper.instructorName || paper.teacher || '').toLowerCase();

      if (examFilter !== 'All' && !term.includes(examFilter.toLowerCase())) {
        return false;
      }
      if (semesterFilter !== 'All' && !sem.includes(semesterFilter.toLowerCase())) {
        return false;
      }
      if (yearFilter !== 'All' && yr !== yearFilter) {
        return false;
      }
      if (teacherFilter !== 'All' && teacher !== teacherFilter.toLowerCase()) {
        return false;
      }
      if (q && !title.includes(q) && !term.includes(q) && !sem.includes(q) && !teacher.includes(q) && !yr.includes(q)) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'oldest') return Number(a.year || 0) - Number(b.year || 0);
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      return Number(b.year || 0) - Number(a.year || 0);
    });
  }, [papers, examFilter, semesterFilter, yearFilter, teacherFilter, sortBy, searchText]);

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

      <header className="papers-intro" data-vt="subject-hero">
        <PageHeader
          title={subject.name}
          subtitle={(
            <span>
              <span className="mono-code" translate="no">{subject.code}</span>
              {' · '}
              {subject.department || 'COMSATS Course'}
            </span>
          )}
        />

        <p className="papers-intro-description">
          Browse previous examinations, filter by midterm or terminal session, bookmark papers for revision, or open a paper to study its model answers and generate a custom quiz.
        </p>
      </header>

      {/* Filters, Search & Sort Controls */}
      <section
        aria-label="Filter and sort past papers"
        className="papers-filter-bar"
      >
        <div>
          <label htmlFor="paper-search-input" className="papers-filter-label">
            Search paper
          </label>
          <input
            id="paper-search-input"
            type="search"
            spellCheck={false}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by exam, teacher (e.g. Dr. Naveed), or year…"
            className="papers-filter-control"
          />
        </div>

        <div>
          <label htmlFor="paper-exam-filter" className="papers-filter-label">
            Exam Type
          </label>
          <select
            id="paper-exam-filter"
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="papers-filter-control"
          >
            {availableExamTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paper-semester-filter" className="papers-filter-label">
            Semester
          </label>
          <select
            id="paper-semester-filter"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="papers-filter-control"
          >
            {availableSemesters.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paper-year-filter" className="papers-filter-label">
            Year
          </label>
          <select
            id="paper-year-filter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="papers-filter-control"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {availableTeachers.length > 2 && (
          <div>
            <label htmlFor="paper-teacher-filter" className="papers-filter-label">
              Teacher / Instructor
            </label>
            <select
              id="paper-teacher-filter"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="papers-filter-control"
            >
              {availableTeachers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="paper-sort-select" className="papers-filter-label">
            Sort By
          </label>
          <select
            id="paper-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="papers-filter-control"
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
          <span className="papers-count tabular-nums" role="status">
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
                <article
                  key={paper.id}
                  className="paper-item-card"
                >
                  <div className="paper-item-icon" aria-hidden="true">
                    <AppIcon name="description" size={24} />
                  </div>

                  <div className="paper-item-copy">
                    <button
                      type="button"
                      className="paper-title-btn"
                      onClick={() => onViewPaper(paper)}
                    >
                      {paper.title}
                    </button>

                    <div className="paper-item-meta">
                      <span className="paper-badge">{paper.term || 'Exam'}</span>

                      {paper.isSample && (
                        <span className="paper-meta-detail" title="Clearly-labelled practice set, not a real exam">
                          Sample practice set
                        </span>
                      )}

                      {(paper.instructorName || paper.teacher) && (
                        <span className="paper-meta-detail" title={`Instructor: ${paper.instructorName || paper.teacher}`}>
                          <AppIcon name="person" size={16} />
                          {paper.instructorName || paper.teacher}
                        </span>
                      )}

                      {paper.year && (
                        <span className="paper-meta-detail tabular-nums">
                          <AppIcon name="calendar_month" size={16} />
                          {paper.year}
                        </span>
                      )}

                      {paper.semester && (
                        <span className="paper-meta-detail">{paper.semester}</span>
                      )}

                      {paper.totalMarks && (
                        <span className="paper-meta-detail tabular-nums">{paper.totalMarks} Marks</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-view-paper"
                    onClick={() => onViewPaper(paper)}
                    aria-label={`Open past paper ${paper.title}`}
                  >
                    <span>View paper</span>
                    <AppIcon name="arrow_forward" size={18} />
                  </button>

                  <button
                    type="button"
                    className={`btn-bookmark-paper ${bookmarked ? 'is-bookmarked' : ''}`}
                    onClick={(e) => handleToggleBookmark(e, paper)}
                    aria-label={bookmarked ? `Remove ${paper.title} from bookmarks` : `Bookmark ${paper.title}`}
                    aria-pressed={bookmarked}
                    title={bookmarked ? 'Bookmarked' : 'Save paper'}
                  >
                    <AppIcon name={bookmarked ? 'bookmark_added' : 'bookmark_add'} size={20} />
                  </button>
                </article>
              );
            })}
          </div>

          {filteredPapers.length > visibleCount && (
            <div className="papers-load-more-wrap">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 8)}
                className="papers-load-more-btn"
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
