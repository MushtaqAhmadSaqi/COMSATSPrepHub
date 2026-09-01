import React, { useState } from 'react';
import './GpaCalculator.css';

export default function GpaCalculator() {
  const [courses, setCourses] = useState([
    { id: 1, name: 'Data Structures & Algorithms', credits: 4, gradePoint: 4.0 },
    { id: 2, name: 'Calculus & Analytical Geometry', credits: 3, gradePoint: 3.7 },
    { id: 3, name: 'Linear Algebra', credits: 3, gradePoint: 3.33 },
    { id: 4, name: 'Human Computer Interaction', credits: 3, gradePoint: 3.0 }
  ]);

  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');

  const gradeOptions = [
    { label: 'A (85-100%) - 4.00', value: 4.0 },
    { label: 'A- (80-84%) - 3.70', value: 3.7 },
    { label: 'B+ (75-79%) - 3.33', value: 3.33 },
    { label: 'B (70-74%) - 3.00', value: 3.0 },
    { label: 'B- (65-69%) - 2.70', value: 2.7 },
    { label: 'C+ (60-64%) - 2.33', value: 2.33 },
    { label: 'C (55-59%) - 2.00', value: 2.0 },
    { label: 'C- (50-54%) - 1.70', value: 1.7 },
    { label: 'D (45-49%) - 1.30', value: 1.3 },
    { label: 'F (<45%) - 0.00', value: 0.0 }
  ];

  const totalCredits = courses.reduce((acc, c) => acc + Number(c.credits || 0), 0);
  const totalPoints = courses.reduce((acc, c) => acc + Number(c.credits || 0) * Number(c.gradePoint || 0), 0);
  const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  let cgpa = sgpa;
  if (prevCgpa && prevCredits && Number(prevCredits) > 0) {
    const oldPoints = Number(prevCgpa) * Number(prevCredits);
    const combinedPoints = oldPoints + totalPoints;
    const combinedCredits = Number(prevCredits) + totalCredits;
    cgpa = combinedCredits > 0 ? (combinedPoints / combinedCredits).toFixed(2) : '0.00';
  }

  const addCourse = () => {
    setCourses([
      ...courses,
      { id: Date.now(), name: `Subject ${courses.length + 1}`, credits: 3, gradePoint: 4.0 }
    ]);
  };

  const removeCourse = (id) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  return (
    <div className="gpa-container">
      <div className="gpa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>COMSATS GPA Calculator</h1>
            <p style={{ color: '#64748b' }}>Calculate your SGPA and predicted CGPA according to COMSATS policies.</p>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0ea5e9' }}>calculate</span>
        </div>

        {/* Previous CGPA Inputs */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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

        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>Current Semester Courses</h3>

        {courses.map((course, idx) => (
          <div key={course.id} className="gpa-row">
            <input
              type="text"
              className="ai-input"
              placeholder="Subject Name"
              value={course.name}
              onChange={(e) => {
                const next = [...courses];
                next[idx].name = e.target.value;
                setCourses(next);
              }}
            />
            <input
              type="number"
              min="1"
              max="6"
              className="ai-input"
              placeholder="Credits"
              value={course.credits}
              onChange={(e) => {
                const next = [...courses];
                next[idx].credits = Number(e.target.value);
                setCourses(next);
              }}
            />
            <select
              className="ai-select"
              value={course.gradePoint}
              onChange={(e) => {
                const next = [...courses];
                next[idx].gradePoint = Number(e.target.value);
                setCourses(next);
              }}
            >
              {gradeOptions.map((g, i) => (
                <option key={i} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeCourse(course.id)}
              style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
              title="Delete Subject"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addCourse}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '9999px',
            background: '#e0f2fe',
            border: 'none',
            fontWeight: 800,
            color: '#0284c7',
            marginTop: '0.5rem',
            cursor: 'pointer',
            display: 'inline-flex',
            align-items: 'center',
            gap: '0.375rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Subject
        </button>

        {/* Results Banner */}
        <div className="gpa-result-box">
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, opacity: 0.9 }}>
                Semester SGPA
              </span>
              <div className="gpa-val">{sgpa}</div>
            </div>
            {prevCgpa && prevCredits && (
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, opacity: 0.9 }}>
                  Cumulative CGPA
                </span>
                <div className="gpa-val">{cgpa}</div>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.75rem' }}>
            Total Credits: {totalCredits} credit hours
          </div>
        </div>
      </div>
    </div>
  );
}
