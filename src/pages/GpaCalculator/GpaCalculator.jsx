import React, { useState, useEffect, useRef } from 'react';
import {
  GRADING_SCALE,
  DEFAULT_SCHEME,
  toNum,
  clamp,
  round2,
  getGradeInfo,
  calcTheoryTotal,
  calcLabTotal,
  calcFinalPercentage,
  calcOverallGpa,
  calcTotalCredits,
  getPerformanceLabel,
  calculateCGPA
} from '../../services/gpaEngine';
import { supabase } from '../../services/supabase';
import './GpaCalculator.css';

const STORAGE_KEY = 'comsatsprephub:gpa-subjects:v1';

export default function GpaCalculator() {
  // Saved Subjects state
  const [subjects, setSubjects] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [subjectName, setSubjectName] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [hasLab, setHasLab] = useState(false);

  // Dynamic Theory Rows
  const [quizzes, setQuizzes] = useState([{ id: 1, obtained: '', total: 10 }]);
  const [assignments, setAssignments] = useState([{ id: 1, obtained: '', total: 10 }]);
  const [mid, setMid] = useState({ obtained: '', total: 25 });
  const [finalExam, setFinalExam] = useState({ obtained: '', total: 50 });

  // Dynamic Lab Rows
  const [labAssignments, setLabAssignments] = useState([{ id: 1, obtained: '', total: 10 }]);
  const [labMid, setLabMid] = useState({ obtained: '', total: 25 });
  const [labFinal, setLabFinal] = useState({ obtained: '', total: 50 });

  // Custom Scheme
  const [scheme, setScheme] = useState(DEFAULT_SCHEME);
  const [showScheme, setShowScheme] = useState(false);

  // Cumulative CGPA state
  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');
  const [calculatedCgpa, setCalculatedCgpa] = useState(null);

  // OCR Drop zone state
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Form Validation Errors
  const [errors, setErrors] = useState({});

  // Form Container Ref for smooth scrolling on edit
  const formCardRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load from LocalStorage & Supabase on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.subjects)) setSubjects(parsed.subjects);
      }
    } catch (e) {
      console.warn('Failed to load saved GPA data from browser:', e);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        supabase
          .from('user_gpa_data')
          .select('subjects')
          .eq('user_id', data.session.user.id)
          .maybeSingle()
          .then(({ data: cloudData }) => {
            if (cloudData?.subjects?.length) setSubjects(cloudData.subjects);
          });
      }
    });
  }, []);

  // Save to LocalStorage & Supabase when subjects change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ subjects, savedAt: new Date().toISOString() }));
    } catch (e) {
      console.warn('Failed to save GPA data to local storage:', e);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id && subjects.length > 0) {
        supabase.from('user_gpa_data').upsert(
          {
            user_id: data.session.user.id,
            subjects,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
    });
  }, [subjects]);

  // Real-time calculation of current form entry
  const theoryTotal = calcTheoryTotal(
    { quizzes, assignments, mid, final: finalExam },
    scheme.theory
  );
  const labTotal = hasLab
    ? calcLabTotal(
        { labAssignments, labMid, labFinal },
        scheme.lab
      )
    : 0;

  const currentPercentage = calcFinalPercentage(theoryTotal, labTotal, hasLab, creditHours);
  const liveGrade = getGradeInfo(currentPercentage);

  // Overall SGPA calculation
  const overallSgpa = calcOverallGpa(subjects);
  const overallCredits = calcTotalCredits(subjects);

  // Calculate CGPA when prevCgpa & prevCredits change or subjects change
  useEffect(() => {
    if (prevCgpa && prevCredits && Number(prevCredits) > 0) {
      const res = calculateCGPA(prevCgpa, prevCredits, overallSgpa, overallCredits);
      setCalculatedCgpa(res);
    } else {
      setCalculatedCgpa(null);
    }
  }, [prevCgpa, prevCredits, overallSgpa, overallCredits]);

  // Form Reset / Clear
  const resetForm = () => {
    setEditingId(null);
    setSubjectName('');
    setCreditHours(3);
    setHasLab(false);
    setQuizzes([{ id: Date.now(), obtained: '', total: 10 }]);
    setAssignments([{ id: Date.now() + 1, obtained: '', total: 10 }]);
    setMid({ obtained: '', total: 25 });
    setFinalExam({ obtained: '', total: 50 });
    setLabAssignments([{ id: Date.now() + 2, obtained: '', total: 10 }]);
    setLabMid({ obtained: '', total: 25 });
    setLabFinal({ obtained: '', total: 50 });
    setErrors({});
  };

  // Submit / Save Subject
  const handleSubmitSubject = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!subjectName.trim()) {
      newErrors.subjectName = 'Please enter a subject name.';
    }

    if (creditHours < 0.5 || creditHours > 6) {
      newErrors.creditHours = 'Credit hours must be between 0.5 and 6.0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      id: editingId || Date.now(),
      name: subjectName.trim(),
      creditHours: Number(creditHours),
      hasLab,
      percentage: currentPercentage,
      gpa: liveGrade.point,
      letter: liveGrade.letter,
      theoryTotal,
      labTotal,
      raw: {
        quizzes,
        assignments,
        mid,
        final: finalExam,
        labAssignments: hasLab ? labAssignments : [],
        labMid: hasLab ? labMid : null,
        labFinal: hasLab ? labFinal : null,
        scheme,
      },
    };

    if (editingId) {
      setSubjects(subjects.map((s) => (s.id === editingId ? payload : s)));
    } else {
      setSubjects([...subjects, payload]);
    }

    resetForm();
  };

  // Populate form for editing
  const handleEditSubject = (subj) => {
    setEditingId(subj.id);
    setSubjectName(subj.name);
    setCreditHours(subj.creditHours);
    setHasLab(Boolean(subj.hasLab));

    if (subj.raw) {
      if (subj.raw.quizzes) setQuizzes(subj.raw.quizzes);
      if (subj.raw.assignments) setAssignments(subj.raw.assignments);
      if (subj.raw.mid) setMid(subj.raw.mid);
      if (subj.raw.final) setFinalExam(subj.raw.final);

      if (subj.raw.labAssignments) setLabAssignments(subj.raw.labAssignments);
      if (subj.raw.labMid) setLabMid(subj.raw.labMid);
      if (subj.raw.labFinal) setLabFinal(subj.raw.labFinal);
      if (subj.raw.scheme) setScheme(subj.raw.scheme);
    }

    if (formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Delete Subject
  const handleDeleteSubject = (id) => {
    setSubjects(subjects.filter((s) => s.id !== id));
    if (editingId === id) resetForm();
  };

  // Simulated AI Screenshot OCR Auto-Filler
  const processOcrFile = (file) => {
    if (!file) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSubjectName('Data Structures & Algorithms');
      setCreditHours(4);
      setHasLab(true);
      setQuizzes([
        { id: 101, obtained: 8.5, total: 10 },
        { id: 102, obtained: 9, total: 10 },
      ]);
      setAssignments([
        { id: 201, obtained: 9.5, total: 10 },
        { id: 202, obtained: 8, total: 10 },
      ]);
      setMid({ obtained: 21.5, total: 25 });
      setFinalExam({ obtained: 42.5, total: 50 });

      setLabAssignments([
        { id: 301, obtained: 9, total: 10 },
        { id: 302, obtained: 10, total: 10 },
      ]);
      setLabMid({ obtained: 23, total: 25 });
      setLabFinal({ obtained: 46, total: 50 });
    }, 1500);
  };

  return (
    <div className="gpa-page-container">
      {/* Hero */}
      <header className="gpa-hero">
        <div className="gpa-hero-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
          COMSATS University Official System
        </div>
        <h1 className="gpa-hero-title">GPA Calculator</h1>
        <p className="gpa-hero-subtitle">
          Compute your credit-hour weighted SGPA & predicted Cumulative CGPA using COMSATS absolute grading policy.
        </p>
      </header>

      {/* Main Two-Column Layout */}
      <div className="gpa-layout-grid">
        {/* LEFT COLUMN: Data Entry Form */}
        <section
          ref={formCardRef}
          className={`gpa-glass-card ${editingId ? 'edit-active' : ''}`}
        >
          <div className="gpa-card-header">
            <div className="gpa-card-title">
              <span className="material-symbols-outlined">edit_note</span>
              Subject Entry
              {editingId && (
                <span className="gpa-edit-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                  Editing
                </span>
              )}
            </div>

            {/* Live Preview Badge */}
            <div className={`gpa-live-badge ${liveGrade.color}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
              <span>{liveGrade.point.toFixed(2)}</span> GPA ({liveGrade.letter})
            </div>
          </div>

          <form onSubmit={handleSubmitSubject}>
            {/* AI Screenshot Drop Zone */}
            <div
              className={`gpa-ocr-zone ${dragActive ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) processOcrFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && processOcrFile(e.target.files[0])}
              />

              {isScanning ? (
                <div className="gpa-ocr-scanning">
                  <div className="gpa-shimmer-bar" />
                  <span className="material-symbols-outlined gpa-ocr-icon animate-spin">sync</span>
                  <div className="gpa-ocr-text-main">Analyzing Portal Screenshot...</div>
                  <div className="gpa-ocr-text-sub">Extracting course name & marks automatically</div>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined gpa-ocr-icon">document_scanner</span>
                  <div className="gpa-ocr-text-main">AI Screenshot Auto-Filler</div>
                  <div className="gpa-ocr-text-sub">Drag & drop your portal marks screenshot here or click to upload</div>
                </>
              )}
            </div>

            {/* Subject Name & Credit Hours */}
            <div className="gpa-grid-pair">
              <div className="gpa-form-group">
                <label className="gpa-label">Subject Name</label>
                <input
                  type="text"
                  className={`gpa-input ${errors.subjectName ? 'is-invalid' : ''}`}
                  placeholder="e.g. Data Structures"
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    if (errors.subjectName) setErrors({ ...errors, subjectName: null });
                  }}
                />
                {errors.subjectName && <span className="gpa-field-error">{errors.subjectName}</span>}
              </div>

              <div className="gpa-form-group">
                <label className="gpa-label">Credit Hours</label>
                <input
                  type="number"
                  min="0.5"
                  max="6"
                  step="0.5"
                  className={`gpa-input ${errors.creditHours ? 'is-invalid' : ''}`}
                  value={creditHours}
                  onChange={(e) => setCreditHours(toNum(e.target.value, 3))}
                />
                {errors.creditHours && <span className="gpa-field-error">{errors.creditHours}</span>}
              </div>
            </div>

            {/* Scheme Customization Accordion */}
            <details className="gpa-scheme-details" open={showScheme} onToggle={(e) => setShowScheme(e.target.open)}>
              <summary className="gpa-scheme-summary">
                <span>Customize Weightage Scheme</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showScheme ? 'expand_less' : 'expand_more'}
                </span>
              </summary>
              <div style={{ marginTop: '0.75rem' }}>
                <p className="gpa-helper" style={{ marginBottom: '0.75rem' }}>
                  Default COMSATS Theory scheme: Quiz 15%, Assignment 10%, Mid 25%, Final 50%.
                </p>
                <div className="gpa-grid-pair">
                  <div>
                    <label className="gpa-label">Quiz Weight (%)</label>
                    <input
                      type="number"
                      className="gpa-input"
                      value={scheme.theory.quizWeight}
                      onChange={(e) => setScheme({
                        ...scheme,
                        theory: { ...scheme.theory, quizWeight: toNum(e.target.value, 15) }
                      })}
                    />
                  </div>
                  <div>
                    <label className="gpa-label">Assignment Weight (%)</label>
                    <input
                      type="number"
                      className="gpa-input"
                      value={scheme.theory.assignmentWeight}
                      onChange={(e) => setScheme({
                        ...scheme,
                        theory: { ...scheme.theory, assignmentWeight: toNum(e.target.value, 10) }
                      })}
                    />
                  </div>
                  <div>
                    <label className="gpa-label">Midterm Weight (%)</label>
                    <input
                      type="number"
                      className="gpa-input"
                      value={scheme.theory.midWeight}
                      onChange={(e) => setScheme({
                        ...scheme,
                        theory: { ...scheme.theory, midWeight: toNum(e.target.value, 25) }
                      })}
                    />
                  </div>
                  <div>
                    <label className="gpa-label">Final Weight (%)</label>
                    <input
                      type="number"
                      className="gpa-input"
                      value={scheme.theory.finalWeight}
                      onChange={(e) => setScheme({
                        ...scheme,
                        theory: { ...scheme.theory, finalWeight: toNum(e.target.value, 50) }
                      })}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Has Lab Switch */}
            <div className="gpa-form-group">
              <label className="gpa-switch-label" onClick={() => setHasLab(!hasLab)}>
                <div className={`gpa-switch-track ${hasLab ? 'active' : ''}`}>
                  <div className="gpa-switch-thumb" />
                </div>
                <span>This subject includes a Lab component</span>
              </label>
            </div>

            {/* THEORY MARKS */}
            <div className="gpa-section-title">Theory Component</div>

            {/* Quizzes */}
            <div className="gpa-form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label className="gpa-label" style={{ margin: 0 }}>Quizzes</label>
                <button
                  type="button"
                  className="gpa-row-add-btn quiz"
                  onClick={() => setQuizzes([...quizzes, { id: Date.now(), obtained: '', total: 10 }])}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  Add Quiz
                </button>
              </div>

              <div className="gpa-dynamic-header">
                <span className="gpa-dynamic-lbl">Obtained</span>
                <span className="gpa-dynamic-lbl">Total</span>
                <span />
              </div>

              {quizzes.map((q, idx) => (
                <div key={q.id} className="gpa-dynamic-row">
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Obtained"
                    value={q.obtained}
                    onChange={(e) => {
                      const next = [...quizzes];
                      next[idx].obtained = e.target.value;
                      setQuizzes(next);
                    }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Total"
                    value={q.total}
                    onChange={(e) => {
                      const next = [...quizzes];
                      next[idx].total = e.target.value;
                      setQuizzes(next);
                    }}
                  />
                  <button
                    type="button"
                    className="gpa-row-remove-btn"
                    onClick={() => {
                      if (quizzes.length === 1) setQuizzes([{ id: Date.now(), obtained: '', total: 10 }]);
                      else setQuizzes(quizzes.filter((_, i) => i !== idx));
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Assignments */}
            <div className="gpa-form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label className="gpa-label" style={{ margin: 0 }}>Assignments</label>
                <button
                  type="button"
                  className="gpa-row-add-btn assignment"
                  onClick={() => setAssignments([...assignments, { id: Date.now(), obtained: '', total: 10 }])}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  Add Assignment
                </button>
              </div>

              <div className="gpa-dynamic-header">
                <span className="gpa-dynamic-lbl">Obtained</span>
                <span className="gpa-dynamic-lbl">Total</span>
                <span />
              </div>

              {assignments.map((a, idx) => (
                <div key={a.id} className="gpa-dynamic-row">
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Obtained"
                    value={a.obtained}
                    onChange={(e) => {
                      const next = [...assignments];
                      next[idx].obtained = e.target.value;
                      setAssignments(next);
                    }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Total"
                    value={a.total}
                    onChange={(e) => {
                      const next = [...assignments];
                      next[idx].total = e.target.value;
                      setAssignments(next);
                    }}
                  />
                  <button
                    type="button"
                    className="gpa-row-remove-btn"
                    onClick={() => {
                      if (assignments.length === 1) setAssignments([{ id: Date.now(), obtained: '', total: 10 }]);
                      else setAssignments(assignments.filter((_, i) => i !== idx));
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Midterm & Final */}
            <div className="gpa-grid-pair">
              <div className="gpa-form-group">
                <label className="gpa-label">Midterm (Obtained / Total)</label>
                <div className="gpa-grid-pair">
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Obt"
                    value={mid.obtained}
                    onChange={(e) => setMid({ ...mid, obtained: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Total"
                    value={mid.total}
                    onChange={(e) => setMid({ ...mid, total: e.target.value })}
                  />
                </div>
              </div>

              <div className="gpa-form-group">
                <label className="gpa-label">Final Exam (Obtained / Total)</label>
                <div className="gpa-grid-pair">
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Obt"
                    value={finalExam.obtained}
                    onChange={(e) => setFinalExam({ ...finalExam, obtained: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className="gpa-input"
                    placeholder="Total"
                    value={finalExam.total}
                    onChange={(e) => setFinalExam({ ...finalExam, total: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* LAB MARKS SECTION (Conditional) */}
            {hasLab && (
              <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <div className="gpa-section-title">Lab Component</div>

                <div className="gpa-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label className="gpa-label" style={{ margin: 0 }}>Lab Items / Tasks</label>
                    <button
                      type="button"
                      className="gpa-row-add-btn assignment"
                      onClick={() => setLabAssignments([...labAssignments, { id: Date.now(), obtained: '', total: 10 }])}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                      Add Lab Item
                    </button>
                  </div>

                  <div className="gpa-dynamic-header">
                    <span className="gpa-dynamic-lbl">Obtained</span>
                    <span className="gpa-dynamic-lbl">Total</span>
                    <span />
                  </div>

                  {labAssignments.map((l, idx) => (
                    <div key={l.id} className="gpa-dynamic-row">
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Obtained"
                        value={l.obtained}
                        onChange={(e) => {
                          const next = [...labAssignments];
                          next[idx].obtained = e.target.value;
                          setLabAssignments(next);
                        }}
                      />
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Total"
                        value={l.total}
                        onChange={(e) => {
                          const next = [...labAssignments];
                          next[idx].total = e.target.value;
                          setLabAssignments(next);
                        }}
                      />
                      <button
                        type="button"
                        className="gpa-row-remove-btn"
                        onClick={() => {
                          if (labAssignments.length === 1) setLabAssignments([{ id: Date.now(), obtained: '', total: 10 }]);
                          else setLabAssignments(labAssignments.filter((_, i) => i !== idx));
                        }}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="gpa-grid-pair">
                  <div className="gpa-form-group">
                    <label className="gpa-label">Lab Midterm</label>
                    <div className="gpa-grid-pair">
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Obt"
                        value={labMid.obtained}
                        onChange={(e) => setLabMid({ ...labMid, obtained: e.target.value })}
                      />
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Total"
                        value={labMid.total}
                        onChange={(e) => setLabMid({ ...labMid, total: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="gpa-form-group">
                    <label className="gpa-label">Lab Final</label>
                    <div className="gpa-grid-pair">
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Obt"
                        value={labFinal.obtained}
                        onChange={(e) => setLabFinal({ ...labFinal, obtained: e.target.value })}
                      />
                      <input
                        type="number"
                        step="0.5"
                        className="gpa-input"
                        placeholder="Total"
                        value={labFinal.total}
                        onChange={(e) => setLabFinal({ ...labFinal, total: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Grade Insight Widget */}
            <div className="gpa-insight-box">
              <div className="gpa-insight-header">
                <span className="gpa-insight-title">Grade Progress Insight</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e' }}>
                  {liveGrade.letter} ({liveGrade.point.toFixed(2)} GPA)
                </span>
              </div>
              <p className="gpa-insight-msg">
                Current aggregate: <strong>{currentPercentage.toFixed(2)}%</strong>
              </p>
              <div className="gpa-insight-progress">
                <div className="gpa-insight-fill" style={{ width: `${currentPercentage}%` }} />
              </div>
            </div>

            {/* Actions */}
            <div className="gpa-actions-row">
              <button type="submit" className="gpa-btn-submit">
                <span className="material-symbols-outlined">
                  {editingId ? 'save' : 'add_circle'}
                </span>
                {editingId ? 'Save Subject Changes' : 'Calculate & Add Subject'}
              </button>
              <button type="button" className="gpa-btn-clear" onClick={resetForm}>
                <span className="material-symbols-outlined">clear_all</span>
                {editingId ? 'Cancel Edit' : 'Clear Form'}
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN: Results & Scale */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Previous CGPA Card */}
          <div className="gpa-glass-card">
            <div className="gpa-card-title" style={{ marginBottom: '0.85rem' }}>
              <span className="material-symbols-outlined">history_edu</span>
              Previous Academic Record (Optional)
            </div>
            <div className="gpa-grid-pair">
              <div>
                <label className="gpa-label">Previous CGPA</label>
                <input
                  type="number"
                  step="0.01"
                  max="4.0"
                  className="gpa-input"
                  placeholder="e.g. 3.45"
                  value={prevCgpa}
                  onChange={(e) => setPrevCgpa(e.target.value)}
                />
              </div>
              <div>
                <label className="gpa-label">Previous Completed Credits</label>
                <input
                  type="number"
                  className="gpa-input"
                  placeholder="e.g. 60"
                  value={prevCredits}
                  onChange={(e) => setPrevCredits(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Added Subjects List */}
          <div className="gpa-glass-card">
            <div className="gpa-card-header">
              <div className="gpa-card-title">
                <span className="material-symbols-outlined">format_list_bulleted</span>
                Current Semester Subjects ({subjects.length})
              </div>
              {subjects.length > 0 && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setSubjects([])}
                >
                  Clear All
                </button>
              )}
            </div>

            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '0.5rem', display: 'block' }}>
                  inbox
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No subjects added yet.</p>
                <p style={{ fontSize: '0.78rem' }}>Fill in your marks on the left to add a course.</p>
              </div>
            ) : (
              <div className="gpa-subjects-list">
                {subjects.map((subj) => (
                  <div key={subj.id} className={`gpa-subject-card ${editingId === subj.id ? 'is-editing' : ''}`}>
                    <div>
                      <div className="gpa-subject-title">{subj.name}</div>
                      <div className="gpa-subject-details">
                        <span>Credits: <strong>{subj.creditHours}</strong></span>
                        <span>Theory: <strong>{subj.theoryTotal.toFixed(1)}%</strong></span>
                        {subj.hasLab && <span>Lab: <strong>{subj.labTotal.toFixed(1)}%</strong></span>}
                        <span>Aggregate: <strong style={{ color: '#0f766e' }}>{subj.percentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>

                    <div className="gpa-subject-badge-col">
                      <div className={`gpa-grade-badge ${getGradeInfo(subj.percentage).color}`}>
                        {subj.letter}
                      </div>

                      <button
                        type="button"
                        className="gpa-card-action-btn"
                        title="Edit Subject"
                        onClick={() => handleEditSubject(subj)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                      </button>
                      <button
                        type="button"
                        className="gpa-card-action-btn delete"
                        title="Delete Subject"
                        onClick={() => handleDeleteSubject(subj)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overall Semester Results Panel */}
          {subjects.length > 0 && (
            <div className="gpa-overall-panel">
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: uppercaseText('uppercase'), letterSpacing: '0.08em', opacity: 0.85, marginBottom: '0.25rem' }}>
                Semester Summary & Performance
              </div>
              <div className="gpa-overall-val">{overallSgpa.toFixed(2)}</div>
              <div className="gpa-overall-label">
                Semester SGPA ({overallCredits} Total Credits)
              </div>

              {calculatedCgpa && (
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '0.75rem 1rem', margin: '1rem 0' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Cumulative CGPA Prediction</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{calculatedCgpa.cgpa}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                    Total Completed Credits: {calculatedCgpa.totalCredits}
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', lineHeight: 1.5, opacity: 0.95 }}>
                {getPerformanceLabel(overallSgpa)}
              </p>
            </div>
          )}

          {/* Official COMSATS Grading Scale Details */}
          <details className="gpa-glass-card">
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined">table_chart</span>
                Official COMSATS Grading Scale Reference
              </span>
              <span className="material-symbols-outlined">expand_more</span>
            </summary>

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.5rem' }}>Grade</th>
                    <th style={{ padding: '0.5rem' }}>Marks Range</th>
                    <th style={{ padding: '0.5rem' }}>Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADING_SCALE.map((scale, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 800 }}>{scale.letter}</td>
                      <td style={{ padding: '0.5rem' }}>{scale.percentMin}% – {scale.percentMax}%</td>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>{scale.point.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

function uppercaseText(str) {
  return str;
}
