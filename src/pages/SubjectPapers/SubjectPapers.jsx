import React, { useState, useEffect } from 'react';
import { fetchPapersForSubjectFromSupabase } from '../../services/papersService';
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
  onViewPaper = () => {}
}) {
  const [papers, setPapers] = useState(DEFAULT_PAPERS);
  const [loading, setLoading] = useState(true);
  const [isFromSupabase, setIsFromSupabase] = useState(false);

  useEffect(() => {
    async function loadPapers() {
      setLoading(true);
      const dbPapers = await fetchPapersForSubjectFromSupabase(subject.code, subject.name);
      if (dbPapers && dbPapers.length > 0) {
        setPapers(dbPapers);
        setIsFromSupabase(true);
      }
      setLoading(false);
    }
    loadPapers();
  }, [subject.code, subject.name]);

  return (
    <div className="papers-container">
      <div className="papers-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <span className="papers-subject-code" style={{ marginBottom: 0 }}>{subject.code}</span>
            {isFromSupabase && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(16,185,129,0.3)' }}>
                ⚡ Supabase Live
              </span>
            )}
          </div>
          <h1 className="papers-title">{subject.name}</h1>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-subtle)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Loading past papers from Supabase...</p>
        </div>
      ) : papers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-subtle)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--border-strong)', marginBottom: '1rem', display: 'block' }}>
            find_in_page
          </span>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>No papers uploaded yet for {subject.code}</p>
          <p style={{ fontSize: '0.875rem' }}>Be the first student to upload a paper for this subject!</p>
        </div>
      ) : (
        <div>
          {papers.map((p, idx) => (
            <div
              key={p.id || idx}
              className="paper-item-card"
              style={{ animationDelay: `${idx * 0.06}s` }}
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
              <button
                type="button"
                className="btn-view-paper"
                onClick={() => onViewPaper(p)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                View Paper
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
