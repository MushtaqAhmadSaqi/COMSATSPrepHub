import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/* ── Spotlight Card with Glow Effect ── */
function SpotlightSubjectCard({ subject, idx, onSelect }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.button
      ref={cardRef}
      type="button"
      className="subject-card spotlight-subject"
      onClick={() => onSelect(subject)}
      aria-label={`Browse ${subject.name} papers`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.04 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      }}
    >
      {isHovered && (
        <motion.div
          className="spotlight-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div className="subject-code">{subject.code}</div>
        <motion.span
          className="material-symbols-outlined"
          style={{ color: 'var(--brand)', opacity: 0.8, fontSize: '20px' }}
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {subject.icon || 'menu_book'}
        </motion.span>
      </div>
      <h3 className="subject-name">{subject.name}</h3>
      <div className="subject-meta">
        <span>{subject.department}</span>
        <span className="subject-papers-count">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
          {subject.papers} Papers
        </span>
      </div>
    </motion.button>
  );
}

/* ── Animated Department Chip ── */
function DepartmentChip({ dept, isSelected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`department-chip ${isSelected ? 'selected' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '0.4rem 1rem',
        borderRadius: '9999px',
        border: '1.5px solid var(--border)',
        background: isSelected ? 'var(--brand)' : 'var(--surface)',
        color: isSelected ? '#ffffff' : 'var(--text-muted)',
        fontWeight: 700,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? 'var(--shadow-brand)' : 'none'
      }}
    >
      {dept}
    </motion.button>
  );
}

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
    <motion.div
      className="subjects-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="subjects-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <motion.h1
            className="subjects-title"
            style={{ marginBottom: 0 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Browse All Subjects
          </motion.h1>
          {isFromSupabase && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: '#10b981',
                background: 'rgba(16,185,129,0.12)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid rgba(16,185,129,0.3)'
              }}
            >
              ⚡ Supabase Live
            </motion.span>
          )}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Select a subject to view past examination papers, quizzes, and solutions.
        </motion.p>
      </div>

      {/* Filter Tabs & Search Row */}
      <div style={{ marginBottom: '2rem' }}>
        <motion.input
          type="text"
          className="subjects-search-bar"
          placeholder="🔍  Search by name, code (e.g. CSC211), or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search subjects"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          whileFocus={{
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.25)'
          }}
        />

        {/* Category Chips */}
        <motion.div
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '-1rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {DEPARTMENTS.map((dept, idx) => (
            <DepartmentChip
              key={dept}
              dept={dept}
              isSelected={selectedDept === dept}
              onClick={() => setSelectedDept(dept)}
            />
          ))}
        </motion.div>
      </div>

      {loading ? (
        <motion.div
          style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-subtle)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.span
            className="material-symbols-outlined"
            style={{ fontSize: '2.5rem' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            progress_activity
          </motion.span>
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Fetching subjects from Supabase...</p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="subjects-empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <span className="material-symbols-outlined">search_off</span>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>No subjects match your filter</p>
          <p style={{ fontSize: '0.875rem' }}>Try selecting "All" or typing a different keyword</p>
        </motion.div>
      ) : (
        <motion.div
          className="subjects-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {filtered.map((subj, idx) => (
              <SpotlightSubjectCard
                key={subj.code}
                subject={subj}
                idx={idx}
                onSelect={onSelectSubject}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
