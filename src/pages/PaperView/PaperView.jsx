import React from 'react';
import './PaperView.css';

export default function PaperView({
  paper = { title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023', file_url: null },
  onBack = () => {}
}) {
  const hasFileUrl = Boolean(paper.file_url);

  return (
    <div className="paperview-container">
      <button type="button" className="btn-back" onClick={onBack}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Papers
      </button>

      <div className="paperview-header">
        <h2>{paper.title}</h2>
        <p>COMSATS Examination Paper · High-Resolution Document Viewer</p>
      </div>

      {hasFileUrl ? (
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-2)', background: '#ffffff', minHeight: '600px' }}>
          <iframe
            src={paper.file_url}
            title={paper.title}
            width="100%"
            height="700px"
            style={{ border: 'none' }}
          />
        </div>
      ) : (
        <div className="paperview-box">
          <div className="paperview-icon-wrap">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>picture_as_pdf</span>
          </div>
          <h3>Supabase Paper Record Loaded</h3>
          <p>
            Viewing <strong>{paper.title}</strong> ({paper.term || 'Exam'} · {paper.year || 'COMSATS'}).
          </p>
          <div className="paperview-actions">
            <button
              type="button"
              className="btn-download"
              onClick={() => {
                if (paper.file_url) {
                  window.open(paper.file_url, '_blank');
                } else {
                  alert('PDF download link will be active when connected to storage bucket.');
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
