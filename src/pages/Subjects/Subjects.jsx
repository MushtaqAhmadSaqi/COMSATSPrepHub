import React, { useState } from 'react';
import './Subjects.css';

const SUBJECTS = [
  { code: 'CSC101', name: 'Introduction to ICT', papers: 14, department: 'CS & IT', icon: 'computer' },
  { code: 'CSC102', name: 'Programming Fundamentals', papers: 22, department: 'CS & IT', icon: 'code' },
  { code: 'CSC211', name: 'Data Structures & Algorithms', papers: 19, department: 'CS & IT', icon: 'account_tree' },
  { code: 'MTH104', name: 'Calculus & Analytical Geometry', papers: 16, department: 'Math', icon: 'functions' },
  { code: 'CSC322', name: 'Operating Systems', papers: 12, department: 'CS & IT', icon: 'memory' },
  { code: 'CSC241', name: 'Object Oriented Programming', papers: 18, department: 'CS & IT', icon: 'hub' },
  { code: 'CSC371', name: 'Database Systems', papers: 15, department: 'CS & IT', icon: 'storage' },
  { code: 'MTH231', name: 'Linear Algebra', papers: 11, department: 'Math', icon: 'grid_on' },
  { code: 'CSC311', name: 'Computer Networks', papers: 13, department: 'CS & IT', icon: 'lan' },
  { code: 'CSC441', name: 'Artificial Intelligence', papers: 10, department: 'CS & IT', icon: 'smart_toy' },
];

export default function Subjects({ onSelectSubject = () => {} }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subjects-container">
      <div className="subjects-header">
        <h1 className="subjects-title">Browse All Subjects</h1>
        <p>Select a subject to view past examination papers, quizzes, and solutions.</p>
      </div>

      <input
        type="text"
        className="subjects-search-bar"
        placeholder="🔍  Search by name or code (e.g. CSC211)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search subjects"
      />

      {filtered.length === 0 ? (
        <div className="subjects-empty">
          <span className="material-symbols-outlined">search_off</span>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>No subjects found</p>
          <p style={{ fontSize: '0.875rem' }}>Try a different search term</p>
        </div>
      ) : (
        <div className="subjects-grid">
          {filtered.map((subj, idx) => (
            <div
              key={subj.code}
              className="subject-card"
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => onSelectSubject(subj)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectSubject(subj)}
            >
              <div className="subject-code">{subj.code}</div>
              <h3 className="subject-name">{subj.name}</h3>
              <div className="subject-meta">
                <span>{subj.department}</span>
                <span className="subject-papers-count">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                  {subj.papers} Papers
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
