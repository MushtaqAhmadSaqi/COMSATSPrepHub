import React, { useState, useEffect } from 'react';
import { fireConfetti } from '../../utils/confetti';
import './GpaCalculator.css';

const GRADE_OPTIONS = [
  { label: 'A  (85–100%) — 4.00', value: 4.0 },
  { label: 'A- (80–84%)  — 3.70', value: 3.7 },
  { label: 'B+ (75–79%)  — 3.33', value: 3.33 },
  { label: 'B  (70–74%)  — 3.00', value: 3.0 },
  { label: 'B- (65–69%)  — 2.70', value: 2.7 },
  { label: 'C+ (60–64%)  — 2.33', value: 2.33 },
  { label: 'C  (55–59%)  — 2.00', value: 2.0 },
  { label: 'C- (50–54%)  — 1.70', value: 1.7 },
  { label: 'D  (45–49%)  — 1.30', value: 1.3 },
  { label: 'F  (<45%)    — 0.00', value: 0.0 },
];

export default function GpaCalculator() {
  const [courses, setCourses] = useState([
    { id: 1, name: 'Data Structures & Algorithms', credits: 4, gradePoint: 4.0 },
    { id: 2, name: 'Calculus & Analytical Geometry', credits: 3, gradePoint: 3.7 },
    { id: 3, name: 'Linear Algebra', credits: 3, gradePoint: 3.33 },
    { id: 4, name: 'Human Computer Interaction', credits: 3, gradePoint: 3.0 },
  ]);

  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');

  const totalCredits = courses.reduce((acc, c) => acc + Number(c.credits || 0), 0);
  const totalPoints  = courses.reduce((acc, c) => acc + Number(c.credits || 0) * Number(c.gradePoint || 0), 0);
  const sgpaNum = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const sgpa = sgpaNum.toFixed(2);

  let cgpa = null;
  let cgpaNum = sgpaNum;
  if (prevCgpa && prevCredits && Number(prevCredits) > 0) {
    const combined = Number(prevCgpa) * Number(prevCredits) + totalPoints;
    cgpaNum = combined / (Number(prevCredits) + totalCredits);
    cgpa = cgpaNum.toFixed(2);
  }

  // Trigger celebration on 4.0 or high GPA!
  useEffect(() => {
    if (sgpaNum >= 3.5 && totalCredits > 0) {
      fireConfetti({ count: 50, spread: 60 });
    }
  }, [sgpaNum, totalCredits]);

  const getGpaStanding = (val) => {
    if (val >= 3.7) return { label: '🌟 Rector List (High Distinction)', color: '#10b981' };
    if (val >= 3.5) return { label: '🏆 Dean List (Distinction)', color: '#0ea5e9' };
    if (val >= 3.0) return { label: '✅ Good Standing', color: '#2563eb' };
    if (val >= 2.0) return { label: '⚠️ Satisfactory', color: '#f59e0b' };
    return { label: '🚨 Academic Warning Risk', color: '#ef4444' };
  };

  const standing = getGpaStanding(cgpaNum);

  const updateCourse = (idx, key, val) => {
    const next = [...courses];
    next[idx] = { ...next[idx], [key]: val };
    setCourses(next);
  };

  const addCourse = () => {
    setCourses([...courses, {
      id: Date.now(),
      name: `Subject ${courses.length + 1}`,
      credits: 3,
      gradePoint: 4.0
    }]);
  };

  const removeCourse = (id) => setCourses(courses.filter(c => c.id !== id));

  return (
    <div className="gpa-container">
      <div className="gpa-card">
        {/* Title Row */}
        <div className="gpa-title-row">
          <div>
            <h1 className="gpa-title">COMSATS GPA Calculator</h1>
            <p className="gpa-subtitle">Instant SGPA and CGPA computation with COMSATS grading policy.</p>
          </div>
          <div className="gpa-icon-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>calculate</span>
          </div>
        </div>

        {/* Previous CGPA */}
        <div className="gpa-prev-box">
          <div>
            <label className="ai-label">Previous CGPA (Optional)</label>
            <input
              type="number"
              step="0.01"
              max="4.0"
              className="ai-input"
              placeholder="e.g. 3.45"
              value={prevCgpa}
              onChange={(e) => setPrevCgpa(e.target.value)}
            />
          </div>
          <div>
            <label className="ai-label">Previous Total Credits (Optional)</label>
            <input
              type="number"
              className="ai-input"
              placeholder="e.g. 60"
              value={prevCredits}
              onChange={(e) => setPrevCredits(e.target.value)}
            />
          </div>
        </div>

        {/* Courses */}
        <h3 className="gpa-section-title">Current Semester Courses</h3>

        {courses.map((course, idx) => (
          <div key={course.id} className="gpa-row" style={{ animationDelay: `${idx * 0.05}s` }}>
            <input
              type="text"
              className="ai-input"
              placeholder="Subject Name"
              value={course.name}
              onChange={(e) => updateCourse(idx, 'name', e.target.value)}
            />
            <input
              type="number"
              min="1"
              max="6"
              className="ai-input"
              placeholder="Credits"
              value={course.credits}
              onChange={(e) => updateCourse(idx, 'credits', Number(e.target.value))}
            />
            <select
              className="ai-select"
              value={course.gradePoint}
              onChange={(e) => updateCourse(idx, 'gradePoint', Number(e.target.value))}
            >
              {GRADE_OPTIONS.map((g, i) => (
                <option key={i} value={g.value}>{g.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="gpa-delete-btn"
              onClick={() => removeCourse(course.id)}
              title="Remove subject"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
            </button>
          </div>
        ))}

        <button type="button" className="gpa-add-btn" onClick={addCourse}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Subject
        </button>

        {/* Results Banner */}
        <div className="gpa-result-box">
          <div className="gpa-result-inner">
            <div>
              <div className="gpa-result-label">Semester SGPA</div>
              <div className="gpa-val">{sgpa}</div>
            </div>
            {cgpa && (
              <div>
                <div className="gpa-result-label">Cumulative CGPA</div>
                <div className="gpa-val">{cgpa}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Total Credit Hours: <strong>{totalCredits}</strong>
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
              {standing.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
