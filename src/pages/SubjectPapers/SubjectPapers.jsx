import React from 'react';
import './SubjectPapers.css';

export default function SubjectPapers({ subject = { name: 'Data Structures & Algorithms', code: 'CSC211' }, onViewPaper = () => {} }) {
  const papers = [
    { id: 1, title: 'Terminal Examination - Fall 2023', term: 'Terminal', year: '2023' },
    { id: 2, title: 'Midterm Examination - Fall 2023', term: 'Midterm', year: '2023' },
    { id: 3, title: 'Sessional 1 Quiz & Solutions - Spring 2024', term: 'Sessional', year: '2024' },
    { id: 4, title: 'Terminal Examination - Spring 2023', term: 'Terminal', year: '2023' }
  ];

  return (
    <div className="papers-container">
      <div className="papers-header">
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0ea5e9' }}>{subject.code}</span>
          <h1 className="papers-title">{subject.name} Past Papers</h1>
        </div>
      </div>

      <div>
        {papers.map((p) => (
          <div key={p.id} className="paper-item-card">
            <div>
              <h4 className="paper-title">{p.title}</h4>
              <span className="paper-badge">{p.term}</span>
            </div>
            <button
              type="button"
              className="btn-view-paper"
              onClick={() => onViewPaper(p)}
            >
              View Paper
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
