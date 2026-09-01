import React from 'react';
import './PaperView.css';

export default function PaperView({ paper = { title: 'Terminal Examination - Fall 2023' }, onBack = () => {} }) {
  return (
    <div className="paperview-container">
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#0ea5e9',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span className="material-symbols-outlined">arrow_back</span> Back to papers
      </button>

      <div className="paperview-header">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{paper.title}</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          COMSATS Examination Paper Viewer & High Resolution Render
        </p>
      </div>

      <div className="paperview-box">
        <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#0ea5e9', marginBottom: '1rem' }}>
          picture_as_pdf
        </span>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interactive Document Viewer Loaded</h3>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Viewing {paper.title}</p>
      </div>
    </div>
  );
}
