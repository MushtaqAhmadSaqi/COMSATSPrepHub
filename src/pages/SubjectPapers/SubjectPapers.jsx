import React from 'react';
import './SubjectPapers.css';

const PAPERS = [
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
  return (
    <div className="papers-container">
      <div className="papers-header">
        <div>
          <div className="papers-subject-code">{subject.code}</div>
          <h1 className="papers-title">{subject.name}</h1>
        </div>
      </div>

      <div>
        {PAPERS.map((p, idx) => (
          <div
            key={p.id}
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
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
