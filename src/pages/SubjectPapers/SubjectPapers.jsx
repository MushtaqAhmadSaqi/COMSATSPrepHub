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
      transition={{ duration: 0.4 }}
    >
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title={subject.name}
        subtitle={`${subject.code} · ${subject.department || 'COMSATS Course'}`}
      />

      {loading ? (
        <div className="skeleton-list" aria-busy="true" aria-label="Loading papers">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPapers} />
      ) : papers.length === 0 ? (
        <EmptyState
          icon="find_in_page"
          title={`No papers uploaded yet for ${subject.code}`}
          description="Be the first student to upload a paper for this subject!"
          actionLabel="Upload Paper"
          onAction={() => window.location.hash = 'upload'}
        />
      ) : (
        <div>
          {papers.map((p, idx) => (
            <motion.button
              key={p.id || idx}
              type="button"
              className="paper-item-card btn-reset"
              onClick={() => onViewPaper(p)}
              aria-label={`View ${p.title}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <div className="paper-item-left">
                <div className="paper-item-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>picture_as_pdf</span>
                </div>
                <div>
                  <div className="paper-title">{p.title}</div>
                  <span className="paper-badge">{p.term} · {p.year}</span>
                </div>
              </div>
              <div className="btn-view-paper">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                View Paper
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

