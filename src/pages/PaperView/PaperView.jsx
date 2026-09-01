import React from 'react';
import './PaperView.css';

export default function PaperView({
  paper = { title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023' },
  onBack = () => {}
}) {
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

      <div className="paperview-box">
        <div className="paperview-icon-wrap">
          <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>picture_as_pdf</span>
        </div>
        <h3>Document Viewer Ready</h3>
        <p>
          Viewing <strong>{paper.title}</strong>. The paper will render here
          when linked to the actual PDF or image source.
        </p>
        <div className="paperview-actions">
          <button type="button" className="btn-download">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Download PDF
          </button>
          <button
            type="button"
            className="btn-download"
            style={{ background: 'var(--surface-3)', color: 'var(--text)', boxShadow: 'none', border: '1.5px solid var(--border)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>share</span>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
