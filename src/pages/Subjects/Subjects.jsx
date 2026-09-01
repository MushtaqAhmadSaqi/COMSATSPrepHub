import React, { useState } from 'react';
import './Subjects.css';

export default function Subjects({ onSelectSubject = () => {} }) {
  const [searchQuery, setSearchQuery] = useState('');

  const subjectsList = [
    { code: 'CSC101', name: 'Introduction to ICT', papers: 14, department: 'CS & IT' },
    { code: 'CSC102', name: 'Programming Fundamentals', papers: 22, department: 'CS & IT' },
    { code: 'CSC211', name: 'Data Structures & Algorithms', papers: 19, department: 'CS & IT' },
    { code: 'MTH104', name: 'Calculus & Analytical Geometry', papers: 16, department: 'Math' },
    { code: 'CSC322', name: 'Operating Systems', papers: 12, department: 'CS & IT' },
    { code: 'CSC241', name: 'Object Oriented Programming', papers: 18, department: 'CS & IT' },
    { code: 'CSC371', name: 'Database Systems', papers: 15, department: 'CS & IT' },
    { code: 'MTH231', name: 'Linear Algebra', papers: 11, department: 'Math' }
  ];

  const filtered = subjectsList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subjects-container">
      <div className="subjects-header">
        <h1 className="subjects-title">Browse All Subjects</h1>
        <p style={{ color: '#64748b' }}>Select a subject to view past examination papers, quizzes, and solutions.</p>
      </div>

      <input
        type="text"
        className="subjects-search-bar"
        placeholder="Search by subject name or code (e.g. CSC211)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="subjects-grid">
        {filtered.map((subj) => (
          <div
            key={subj.code}
            className="subject-card"
            onClick={() => onSelectSubject(subj)}
          >
            <div className="subject-code">{subj.code}</div>
            <h3 className="subject-name">{subj.name}</h3>
            <div className="subject-meta">
              <span>{subj.department}</span>
              <span>{subj.papers} Papers</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
