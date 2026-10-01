import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchPapersForSubjectFromSupabase } from '../../services/papersService';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import './SubjectPapers.css';

export default function SubjectPapers({
  subject = { name: 'Data Structures & Algorithms', code: 'CSC211' },
  onViewPaper = () => {},
  onBack = () => {}
}) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadPapers = () => {
    setReloadKey(value => value + 1);
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

  const breadcrumbItems = [
    { label: 'Subjects', onClick: onBack },
    { label: subject.name }
  ];

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
          Browse previous examinations and open a paper to study its
          questions and available model answers.
        </p>
      </header>

      <div className="papers-section-heading">
        <h2>Available papers</h2>

        {!loading && !error && (
          <span className="papers-count" role="status">
            {papers.length} {papers.length === 1 ? 'paper' : 'papers'}
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
      ) : papers.length === 0 ? (
        <EmptyState
          icon="find_in_page"
          title={`No papers uploaded yet for ${subject.code}`}
          description="New papers will appear here when they become available."
          actionLabel="Upload Paper"
          onAction={() => {
            window.location.hash = 'upload';
          }}
        />
      ) : (
        <div className="papers-list">
          {papers.map((paper) => (
            <button
              key={paper.id}
              type="button"
              className="paper-item-card"
              onClick={() => onViewPaper(paper)}
              aria-label={`View ${paper.title}`}
            >
              <span className="paper-item-icon" aria-hidden="true">
                <span className="material-symbols-outlined">description</span>
              </span>

              <span className="paper-item-copy">
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
                </span>
              </span>

              <span className="btn-view-paper">
                View paper
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
