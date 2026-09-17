import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchPapersForSubjectFromSupabase } from '../../services/papersService';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import './SubjectPapers.css';

const DEFAULT_PAPERS = [
  { id: 1, title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023' },
  { id: 2, title: 'Midterm Examination — Fall 2023', term: 'Midterm', year: '2023' },
  { id: 3, title: 'Sessional 1 Quiz & Solutions — Spring 2024', term: 'Sessional', year: '2024' },
  { id: 4, title: 'Terminal Examination — Spring 2023', term: 'Terminal', year: '2023' },
  { id: 5, title: 'Midterm Examination — Spring 2023', term: 'Midterm', year: '2023' },
];

export default function SubjectPapers({
  subject = { name: 'Data Structures & Algorithms', code: 'CSC211' },
  onViewPaper = () => {},
  onBack = () => {}
}) {
  const [papers, setPapers] = useState(DEFAULT_PAPERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbPapers = await fetchPapersForSubjectFromSupabase(subject.code, subject.name);
      if (dbPapers && dbPapers.length > 0) {
        setPapers(dbPapers);
      }
    } catch (err) {
      setError(err.message || 'Failed to load papers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, [subject.code, subject.name]);

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

