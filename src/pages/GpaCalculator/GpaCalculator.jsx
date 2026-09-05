import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '../../utils/confetti';
import './GpaCalculator.css';

const GRADE_OPTIONS = [
  { label: 'A', value: 4.0, color: 'emerald' },
  { label: 'A-', value: 3.7, color: 'emerald' },
  { label: 'B+', value: 3.33, color: 'sky' },
  { label: 'B', value: 3.0, color: 'sky' },
  { label: 'B-', value: 2.7, color: 'sky' },
  { label: 'C+', value: 2.33, color: 'amber' },
  { label: 'C', value: 2.0, color: 'amber' },
  { label: 'C-', value: 1.7, color: 'orange' },
  { label: 'D', value: 1.3, color: 'orange' },
  { label: 'F', value: 0.0, color: 'red' },
];

/* ── Animated Grade Badge ── */
function AnimatedGradeBadge({ className, children }) {
  return (
    <motion.span
      className={`grade-badge-animated ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.span>
  );
}

/* ── Animated Input with Focus Ring ── */
function AnimatedInput({ type, placeholder, value, onChange, className = '', min, max, step }) {
  return (
    <motion.input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`gpa-input animated ${className}`}
      min={min}
      max={max}
      step={step}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ borderColor: '#0ea5e9' }}
      whileFocus={{
        borderColor: '#2563eb',
        boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.25)'
      }}
    />
  );
}

/* ── Animated Select Dropdown ── */
function AnimatedSelect({ value, onChange, children, className = '' }) {
  return (
    <motion.select
      value={value}
      onChange={onChange}
      className={`gpa-input animated ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ borderColor: '#0ea5e9' }}
      whileFocus={{
        borderColor: '#2563eb',
        boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.25)'
      }}
    >
      {children}
    </motion.select>
  );
}

/* ── Animated Number Display ── */
function AnimatedNumber({ value, suffix = '', className = '' }) {
  return (
    <motion.div
      className={`gpa-number ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, type: 'spring', stiffness: 200 }}
    >
      <span className="gpa-number-value">{value}</span>
      {suffix && <span className="gpa-number-suffix">{suffix}</span>}
    </motion.div>
  );
}

/* ── Confetti Trigger Hook ── */
function useConfettiTrigger() {
  const prevValueRef = useRef(null);
  const triggerConfetti = (currentValue, threshold = 3.5) => {
    if (
      prevValueRef.current !== null &&
      prevValueRef.current < threshold &&
      currentValue >= threshold
    ) {
      fireConfetti({ count: 50, spread: 60 });
    }
    prevValueRef.current = currentValue;
  };
  return triggerConfetti;
}

/* ── Animated Card Container ── */
function AnimatedCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={`gpa-glass-card animated ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Subject Card with Hover Lift ── */
function SubjectCard({ course, idx, updateCourse, removeCourse, gradeInfo }) {
  return (
    <motion.div
      key={course.id}
      className="gpa-subject-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{ flex: 1 }}>
        <AnimatedInput
          type="text"
          placeholder="Subject Name"
          value={course.name}
          onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
          className="subject-name-input"
          style={{ fontWeight: 700, marginBottom: '0.5rem' }}
        />
        <div className="gpa-subject-details">
          <div className="subject-details-row">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>schedule</span>
            <AnimatedInput
              type="number"
              min="1"
              max="6"
              placeholder="Credits"
              value={course.credits}
              onChange={(e) => updateCourse(course.id, 'credits', Number(e.target.value))}
              className="credits-input"
              style={{ width: '80px' }}
            />
            credit hrs
          </div>
          <AnimatedSelect
            value={course.gradePoint}
            onChange={(e) => updateCourse(course.id, 'gradePoint', Number(e.target.value))}
            className="grade-select"
          >
            {GRADE_OPTIONS.map((g, i) => (
              <option key={i} value={g.value}>
                {g.label} ({g.value.toFixed(2)})
              </option>
            ))}
          </AnimatedSelect>
        </div>
      </div>
      <div className="gpa-subject-badge-col">
        <AnimatedGradeBadge className={`gpa-grade-badge ${gradeInfo.color}`}>
          {gradeInfo.label}
        </AnimatedGradeBadge>
        <motion.button
          type="button"
          className="gpa-card-action-btn delete"
          onClick={() => removeCourse(course.id)}
          title="Remove subject"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

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
  const totalPoints = courses.reduce((acc, c) => acc + Number(c.credits || 0) * Number(c.gradePoint || 0), 0);
  const sgpaNum = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const sgpa = sgpaNum.toFixed(2);

  let cgpa = null;
  let cgpaNum = sgpaNum;
  if (prevCgpa && prevCredits && Number(prevCredits) > 0) {
    const combined = Number(prevCgpa) * Number(prevCredits) + totalPoints;
    cgpaNum = combined / (Number(prevCredits) + totalCredits);
    cgpa = cgpaNum.toFixed(2);
  }

  // Fire confetti only when SGPA crosses INTO the ≥ 3.5 band
  const triggerConfetti = useConfettiTrigger();
  useEffect(() => {
    triggerConfetti(sgpaNum, 3.5);
  }, [sgpaNum]);

  const getGpaStanding = (val) => {
    if (val >= 3.7) return { label: 'Rector List (High Distinction)', color: '#10b981' };
    if (val >= 3.5) return { label: 'Dean List (Distinction)', color: '#0ea5e9' };
    if (val >= 3.0) return { label: 'Good Standing', color: '#2563eb' };
    if (val >= 2.0) return { label: 'Satisfactory', color: '#f59e0b' };
    return { label: 'Academic Warning Risk', color: '#ef4444' };
  };

  const standing = getGpaStanding(cgpaNum);

  const getGradeInfo = (gradePoint) => {
    return GRADE_OPTIONS.find(g => g.value === Number(gradePoint)) || { label: 'N/A', color: 'gray' };
  };

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
    <motion.div
      className="gpa-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <AnimatedCard delay={0.1}>
        <div className="gpa-hero">
          <div className="gpa-hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>school</span>
            COMSATS Grading Scale
          </div>
          <motion.h1
            className="gpa-hero-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            GPA Calculator
          </motion.h1>
          <motion.p
            className="gpa-hero-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Instantly compute your Semester GPA (SGPA) and Cumulative GPA (CGPA) using the official COMSATS grading policy.
          </motion.p>
        </div>
      </AnimatedCard>

      {/* Two-Column Layout */}
      <div className="gpa-layout-grid">
        {/* Left Column — Course Input */}
        <AnimatedCard delay={0.2}>
          <div className="gpa-glass-card">
            <div className="gpa-card-header">
              <div className="gpa-card-title">
                <span className="material-symbols-outlined">edit_note</span>
                Current Semester
              </div>
              <div className="gpa-live-badge">
                <AnimatedNumber value={sgpa} />
              </div>
            </div>

            {/* Previous CGPA Section */}
            <div className="gpa-form-group">
              <label className="gpa-label">Previous CGPA (Optional)</label>
              <AnimatedInput
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                className="gpa-input"
                placeholder="e.g. 3.45"
                value={prevCgpa}
                onChange={(e) => setPrevCgpa(e.target.value)}
              />
            </div>

            <div className="gpa-form-group">
              <label className="gpa-label">Previous Total Credits (Optional)</label>
              <AnimatedInput
                type="number"
                min="0"
                className="gpa-input"
                placeholder="e.g. 60"
                value={prevCredits}
                onChange={(e) => setPrevCredits(e.target.value)}
              />
            </div>

            <div className="gpa-section-title">Courses This Semester</div>

            {/* Subject Cards List */}
            <div className="gpa-subjects-list">
              {courses.map((course, idx) => {
                const gradeInfo = getGradeInfo(course.gradePoint);
                return (
                  <SubjectCard
                    key={course.id}
                    course={course}
                    idx={idx}
                    updateCourse={updateCourse}
                    removeCourse={removeCourse}
                    gradeInfo={gradeInfo}
                  />
                );
              })}
            </div>

            {/* Add Subject Button */}
            <motion.button
              type="button"
              className="gpa-row-add-btn quiz"
              onClick={addCourse}
              style={{ marginTop: '1rem' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Add Subject
            </motion.button>
          </div>
        </AnimatedCard>

        {/* Right Column — Results Panel */}
        <AnimatedCard delay={0.3}>
          <div className="gpa-glass-card">
            <div className="gpa-card-header">
              <div className="gpa-card-title">
                <span className="material-symbols-outlined">analytics</span>
                GPA Summary
              </div>
            </div>

            {/* SGPA Result */}
            <div className="gpa-overall-panel">
              <div className="gpa-overall-label">Semester GPA (SGPA)</div>
              <AnimatedNumber value={sgpa} className="sgpa-number-large" />
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                {totalCredits} Credit Hours
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {standing.label}
              </div>
            </div>

            {/* CGPA Result (if previous data provided) */}
            {cgpa && (
              <div className="gpa-overall-panel" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                <div className="gpa-overall-label">Cumulative GPA (CGPA)</div>
                <AnimatedNumber value={cgpa} className="cgpa-number-large" />
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {Number(prevCredits) + totalCredits} Total Credit Hours
                </div>
              </div>
            )}

            {/* Insight Box */}
            <div className="gpa-insight-box">
              <div className="gpa-insight-header">
                <span className="gpa-insight-title">Performance Insight</span>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#0f766e' }}>lightbulb</span>
              </div>
              <motion.p
                className="gpa-insight-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {sgpaNum >= 3.7
                  ? "Outstanding! You're on the Rector's List with high distinction."
                  : sgpaNum >= 3.5
                  ? "Excellent work! Dean's List distinction achieved."
                  : sgpaNum >= 3.0
                  ? "Good standing. Keep up the solid performance!"
                  : sgpaNum >= 2.0
                  ? "Satisfactory progress. Consider seeking academic support."
                  : "Academic support recommended. Meet with your advisor."}
              </motion.p>
              <div className="gpa-insight-progress">
                <motion.div
                  className="gpa-insight-fill"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, (sgpaNum / 4) * 100)}%` }}
                  transition={{ duration: 1.2, type: 'spring' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="gpa-actions-row">
              <motion.button
                type="button"
                className="gpa-btn-clear"
                onClick={() => {
                  setCourses([{ id: Date.now(), name: 'Subject 1', credits: 3, gradePoint: 4.0 }]);
                  setPrevCgpa('');
                  setPrevCredits('');
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
                Reset
              </motion.button>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </motion.div>
  );
}