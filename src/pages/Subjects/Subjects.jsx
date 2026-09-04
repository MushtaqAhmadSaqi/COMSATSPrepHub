import React, { useState, useEffect } from 'react';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import './Subjects.css';

const DEFAULT_SUBJECTS = [
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
  { code: 'EEE241', name: 'Digital Logic Design', papers: 9, department: 'Electrical', icon: 'developer_board' },
  { code: 'SWE301', name: 'Software Engineering Concepts', papers: 17, department: 'Software Eng', icon: 'terminal' }
];

const DEPARTMENTS = ['All', 'CS & IT', 'Math', 'Software Eng', 'Electrical'];

export default function Subjects({ onSelectSubject = () => {} }) {
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isFromSupabase, setIsFromSupabase] = useState(false);

  useEffect(() => {
    async function loadSupabaseSubjects() {
      setLoading(true);
      const dbSubjects = await fetchSubjectsFromSupabase();
      if (dbSubjects && dbSubjects.length > 0) {
        setSubjects(dbSubjects);
        setIsFromSupabase(true);
      }
      setLoading(false);
    }
    loadSupabaseSubjects();
  }, []);

  const filtered = subjects.filter(s => {
    const matchesDept = selectedDept === 'All' || s.department === selectedDept;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesQuery;
  });

  return (
    <div className="subjects-container">
      <div className="subjects-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h1 className="subjects-title" style={{ marginBottom: 0 }}>Browse All Subjects</h1>
          {isFromSupabase && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(16,185,129,0.3)' }}>
              ⚡ Supabase Live
            </span>
          )}
        </div>
        <p>Select a subject to view past examination papers, quizzes, and solutions.</p>
      </div>

      {/* Filter Tabs & Search Row */}
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          className="subjects-search-bar"
          placeholder="🔍  Search by name, code (e.g. CSC211), or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search subjects"
        />

        {/* Category Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '-1rem' }}>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                border: '1.5px solid var(--border)',
                background: selectedDept === dept ? 'var(--brand)' : 'var(--surface)',
                color: selectedDept === dept ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedDept === dept ? 'var(--shadow-brand)' : 'none'
              }}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-subtle)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Fetching subjects from Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="subjects-empty">
          <span className="material-symbols-outlined">search_off</span>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>No subjects match your filter</p>
          <p style={{ fontSize: '0.875rem' }}>Try selecting "All" or typing a different keyword</p>
        </div>
      ) : (
        <div className="subjects-grid">
          {filtered.map((subj, idx) => (
            <button
              type="button"
              key={subj.code}
              className="subject-card"
              style={{ animationDelay: `${idx * 0.04}s` }}
              onClick={() => onSelectSubject(subj)}
              aria-label={`Browse ${subj.name} papers`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <div className="subject-code">{subj.code}</div>
                <span className="material-symbols-outlined" style={{ color: 'var(--brand)', opacity: 0.8, fontSize: '20px' }}>
                  {subj.icon || 'menu_book'}
                </span>
              </div>
              <h3 className="subject-name">{subj.name}</h3>
              <div className="subject-meta">
                <span>{subj.department}</span>
                <span className="subject-papers-count">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                  {subj.papers} Papers
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
