import React, { useId, useRef, useState } from 'react';
import {
  COURSE_CREDIT_MIN,
  COURSE_CREDIT_MAX,
  GRADING_SCALE,
  NTS_NAT_WEIGHTS,
  isValidCourseCredits,
  calcSessionalCourseResult,
  calculateRequiredSgpa,
  calculateNtsAggregate,
} from '../../services/gpaEngine';
import { getSemesterGpaHistory, saveSemesterGpaEntry } from '../../utils/studyTracker';
import { authHelper } from '../../services/supabase';
import { useToast } from '../../utils/toast';
import AppIcon from '../../components/ui/AppIcon';
import './GpaCalculator.css';

const GRADE_BY_LETTER = new Map(GRADING_SCALE.map((item) => [item.letter, item]));
const RETAKE_GRADES = GRADING_SCALE.slice(5);

const WORKSPACE_TABS = [
  { id: 'semester', label: 'Semester GPA', icon: 'school' },
  { id: 'planner', label: 'Target CGPA', icon: 'track_changes' },
  { id: 'sessional', label: 'Subject marks', icon: 'calculate' },
  { id: 'nat', label: 'NAT aggregate', icon: 'fact_check' },
];

const LAB_COMPONENTS = [
  ['labAssignObtained', 'labAssignTotal', 'Lab assignment', '25%'],
  ['labMidObtained', 'labMidTotal', 'Lab midterm', '25%'],
  ['labFinalObtained', 'labFinalTotal', 'Lab final', '50%'],
];

const NAT_EXAMS = [
  { exam: 'matric', label: 'SSC / Matric' },
  { exam: 'hssc', label: 'HSSC / Intermediate' },
  { exam: 'nat', label: 'NTS NAT' },
];

const CHART_GUIDES = [4, 3, 2, 1];

function parseNumber(value) {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatGpa(value) {
  return value === null ? '—' : value.toFixed(2);
}

function createCourse(id, overrides = {}) {
  return {
    id,
    name: '',
    credits: '3',
    grade: '',
    isRetake: false,
    oldGrade: 'F',
    ...overrides,
  };
}

export function GpaCalculator() {
  const componentId = useId();
  const nextId = useRef(4);
  const tabRefs = useRef([]);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('semester');
  const [courses, setCourses] = useState(() => [
    createCourse(1, { name: 'Data Structures', credits: '4', grade: 'A-' }),
    createCourse(2, { name: 'Discrete Structures', credits: '3', grade: 'A' }),
    createCourse(3, { name: 'Database Systems', credits: '4', grade: 'B+' }),
  ]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState('3.38');
  const [prevCredits, setPrevCredits] = useState('60');

  const [targetCgpa, setTargetCgpa] = useState('3.50');
  const [upcomingCredits, setUpcomingCredits] = useState('15');
  const [remainingSemesters, setRemainingSemesters] = useState('2');
  const [creditPlanMode, setCreditPlanMode] = useState('semesters');

  const [natInputs, setNatInputs] = useState({
    matricObtained: '',
    matricTotal: '1100',
    hsscObtained: '',
    hsscTotal: '1100',
    natObtained: '',
    natTotal: '100',
  });

  const [semesterHistory, setSemesterHistory] = useState(() => getSemesterGpaHistory());
  const [semesterLabel, setSemesterLabel] = useState('Current Sem');

  const [sessionalInputs, setSessionalInputs] = useState({
    quizObtained: '12',
    quizTotal: '15',
    assignObtained: '8.5',
    assignTotal: '10',
    midObtained: '20',
    midTotal: '25',
    finalObtained: '40',
    finalTotal: '50',
    hasLab: false,
    labAssignObtained: '20',
    labAssignTotal: '25',
    labMidObtained: '20',
    labMidTotal: '25',
    labFinalObtained: '40',
    labFinalTotal: '50',
    creditHours: '3',
  });
  const [sessionalSubjectName, setSessionalSubjectName] = useState('');
  const [scanImageName, setScanImageName] = useState('');
  const [isScanningSubject, setIsScanningSubject] = useState(false);
  const sessionalImageInputRef = useRef(null);

  const sessionalResult = calcSessionalCourseResult(sessionalInputs);

  const natResult = calculateNtsAggregate(
    Object.fromEntries(
      Object.entries(natInputs).map(([field, value]) => [field, parseNumber(value)])
    )
  );

  // Single-pass course evaluation and aggregation
  let completedCount = 0;
  let hasInvalidCredits = false;
  let totalCredits = 0;
  let totalQualityPoints = 0;
  let retakeCredits = 0;
  let retakeOldQualityPoints = 0;

  const evaluatedCourses = courses.map((course) => {
    const parsedCredits = parseNumber(course.credits);
    const gradeInfo = GRADE_BY_LETTER.get(course.grade);
    const oldGradeInfo = GRADE_BY_LETTER.get(course.oldGrade);
    const validCredits = isValidCourseCredits(parsedCredits);
    const complete = validCredits && Boolean(gradeInfo);

    if (!validCredits) hasInvalidCredits = true;

    if (complete) {
      completedCount += 1;
      totalCredits += parsedCredits;
      totalQualityPoints += parsedCredits * gradeInfo.point;
      if (course.isRetake) {
        retakeCredits += parsedCredits;
        retakeOldQualityPoints += parsedCredits * (oldGradeInfo?.point ?? 0);
      }
    }

    return { ...course, parsedCredits, gradeInfo, oldGradeInfo, validCredits, complete };
  });

  const ready = courses.length > 0 && completedCount === courses.length;
  const sgpa = ready ? totalQualityPoints / totalCredits : null;

  const previousGpa = parseNumber(prevCgpa);
  const previousCreditCount = parseNumber(prevCredits);

  const validPreviousGpa = previousGpa !== null && previousGpa >= 0 && previousGpa <= 4;
  const validPreviousCredits =
    previousCreditCount !== null && Number.isInteger(previousCreditCount) && previousCreditCount > 0;
  const historyReady = validPreviousGpa && validPreviousCredits;

  const netCombinedCredits = historyReady
    ? Math.max(1, previousCreditCount + totalCredits - retakeCredits)
    : 0;

  const cgpa =
    includeHistory && ready && historyReady
      ? Math.min(
          4.0,
          Math.max(
            0,
            (previousGpa * previousCreditCount - retakeOldQualityPoints + totalQualityPoints) /
              netCombinedCredits
          )
        )
      : null;

  const parsedTarget = parseNumber(targetCgpa);
  const parsedUpcomingCr = parseNumber(upcomingCredits);
  const parsedSemesters = parseNumber(remainingSemesters);
  const validSemesters = Number.isSafeInteger(parsedSemesters) && parsedSemesters > 0;
  const validUpcomingCredits = Number.isSafeInteger(parsedUpcomingCr) && parsedUpcomingCr > 0;
  const remainingCreditCount =
    creditPlanMode === 'semesters'
      ? validSemesters && validUpcomingCredits
        ? parsedSemesters * parsedUpcomingCr
        : null
      : parsedUpcomingCr;

  const targetResult = calculateRequiredSgpa({
    currentCgpa: previousGpa,
    completedCredits: previousCreditCount,
    remainingCredits: remainingCreditCount,
    targetCgpa: parsedTarget,
  });

  const plannerFields = [
    {
      key: 'currentCgpa',
      id: 'previous-gpa',
      label: 'Current CGPA',
      value: prevCgpa,
      update: setPrevCgpa,
      min: 0,
      max: 4,
      step: '0.01',
      placeholder: 'e.g. 3.25',
    },
    {
      key: 'completedCredits',
      id: 'previous-credits',
      label: 'Completed credit hours',
      value: prevCredits,
      update: setPrevCredits,
      min: 1,
      step: '1',
      placeholder: 'e.g. 60',
    },
    {
      key: 'targetCgpa',
      id: 'target-cgpa',
      label: 'Target CGPA',
      value: targetCgpa,
      update: setTargetCgpa,
      min: 0,
      max: 4,
      step: '0.01',
      placeholder: 'e.g. 3.50',
    },
  ];

  const sgpaProgress = sgpa === null ? 0 : Math.min(100, Math.max(0, (sgpa / 4) * 100));

  let statusText = 'Select a grade for each course to calculate your semester GPA.';
  if (courses.length === 0) {
    statusText = 'Add your first course to get started.';
  } else if (hasInvalidCredits) {
    statusText = 'Enter positive whole-number credits for every course.';
  } else if (ready) {
    statusText = `Based on ${courses.length} ${courses.length === 1 ? 'course' : 'courses'} and ${totalCredits} credit hours.`;
  }

  function updateCourse(id, field, value) {
    setCourses((current) =>
      current.map((course) => (course.id === id ? { ...course, [field]: value } : course))
    );
  }

  function addCourse(overrides = {}) {
    const id = nextId.current++;
    setCourses((current) => [...current, createCourse(id, overrides)]);
  }

  function removeCourse(id) {
    setCourses((current) => current.filter((course) => course.id !== id));
  }

  function resetCalculator() {
    const id = nextId.current++;
    setCourses([createCourse(id)]);
    setPrevCgpa('');
    setPrevCredits('');
    setIncludeHistory(false);
    toast.info('Calculator reset.');
  }

  function handleSaveSemesterToHistory() {
    if (sgpa === null) return;
    const next = saveSemesterGpaEntry({
      label: semesterLabel.trim() || `Sem ${semesterHistory.length + 1}`,
      sgpa,
      credits: totalCredits,
    });
    setSemesterHistory(next);
    toast.success('Semester SGPA saved to your history chart.');
  }

  function sumMarkEntries(entries) {
    if (!Array.isArray(entries)) return { obtained: 0, total: 0 };
    return entries.reduce(
      (sum, entry) => ({
        obtained: sum.obtained + (Number(entry?.obtained) || 0),
        total: sum.total + (Number(entry?.total) || 0),
      }),
      { obtained: 0, total: 0 }
    );
  }

  function scaleMarks(mark, weight) {
    if (!mark || mark.total <= 0) return '';
    return String(Number(((mark.obtained / mark.total) * weight).toFixed(2)));
  }

  async function handleSessionalImageScan(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      toast.error('Upload a PNG, JPEG, or WebP screenshot.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('The screenshot must be smaller than 3 MB.');
      return;
    }

    setScanImageName(file.name);
    setIsScanningSubject(true);

    try {
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the image.'));
        reader.readAsDataURL(file);
      });

      const token = await authHelper.getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64 }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not analyze this screenshot.');
      }

      const theory = payload.theory || {};
      const quizzes = sumMarkEntries(theory.quizzes);
      const assignments = sumMarkEntries(theory.assignments);

      setSessionalSubjectName(payload.subjectName || '');
      setSessionalInputs((current) => ({
        ...current,
        quizObtained: scaleMarks(quizzes, 15),
        assignObtained: scaleMarks(assignments, 10),
        midObtained: scaleMarks(theory.mid, 25),
        finalObtained: scaleMarks(theory.final, 50),
        creditHours:
          Number.isInteger(payload.creditHours) && payload.creditHours > 0
            ? String(payload.creditHours)
            : current.creditHours,
      }));
      toast.success(
        payload.subjectName ? `${payload.subjectName} marks added.` : 'Screenshot marks added.'
      );
    } catch (error) {
      toast.error(error.message || 'Could not analyze this screenshot.');
    } finally {
      setIsScanningSubject(false);
    }
  }

  function handleApplySessionalToCourses() {
    const credits = sessionalInputs.hasLab ? '4' : '3';
    const subjectName = sessionalSubjectName.trim();
    const hasSingleEmptyRow =
      courses.length === 1 && courses[0].name.trim() === '' && courses[0].grade === '';

    if (hasSingleEmptyRow) {
      setCourses((current) => [
        {
          ...current[0],
          name: subjectName || current[0].name,
          credits,
          grade: sessionalResult.letter,
        },
      ]);
    } else {
      addCourse({ name: subjectName, credits, grade: sessionalResult.letter });
    }
    setActiveTab('semester');
    toast.success(`Added Grade ${sessionalResult.letter} (${credits} cr) to semester courses.`);
  }

  function handleExportPrint() {
    window.print();
  }

  function handleTabKeyDown(event, index) {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % WORKSPACE_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = WORKSPACE_TABS.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveTab(WORKSPACE_TABS[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  const requiredDisplay =
    targetResult.status === 'invalid'
      ? '—'
      : targetResult.status === 'impossible'
        ? targetResult.requiredSgpa.toFixed(2)
        : (Math.ceil(targetResult.requiredSgpa * 100 - 1e-9) / 100).toFixed(2);

  const requiredProgress =
    targetResult.status === 'invalid'
      ? 0
      : Math.min(100, Math.max(0, (targetResult.requiredSgpa / 4) * 100));

  const sessionalPct = Math.min(100, Math.max(0, Number(sessionalResult.combinedPct) || 0));

  return (
    <div className="grade-workspace">
      <header className="grade-workspace__header">
        <div className="grade-workspace__title-group">
          <h1>GPA &amp; academic calculator</h1>
          <p className="grade-workspace__intro">
            Calculate semester GPA with retakes, plan target CGPA, estimate subject marks, and check COMSATS NTS NAT aggregate.
          </p>
        </div>

        <div className="grade-workspace__header-actions">
          <button
            type="button"
            className="grade-workspace__print-btn"
            onClick={handleExportPrint}
          >
            <AppIcon name="print" size={18} />
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      <nav className="grade-workspace__nav" aria-label="Calculator tools">
        <div className="grade-workspace__tablist" role="tablist">
          {WORKSPACE_TABS.map((tab, index) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el; }}
                id={`${componentId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`${componentId}-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                className={`grade-workspace__tab${isSelected ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <AppIcon name={tab.icon} size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grade-workspace__layout">
        <div className="grade-workspace__main">
          {activeTab === 'semester' ? (
            <div
              id={`${componentId}-panel-semester`}
              role="tabpanel"
              aria-labelledby={`${componentId}-tab-semester`}
              className="grade-workspace__tabpanel"
            >
              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-courses-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-courses-title`}>Semester courses</h2>
                    <p>Enter your credit hours and expected or earned letter grades.</p>
                  </div>
                  <p className="grade-workspace__meta tabular-nums">
                    {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                    {totalCredits > 0 ? ` · ${totalCredits} cr` : ''}
                  </p>
                </div>

                {courses.length > 0 ? (
                  <>
                    <div className="grade-workspace__table-head" aria-hidden="true">
                      <span>Course</span>
                      <span>Credits</span>
                      <span>Grade</span>
                      <span />
                    </div>

                    <div className="grade-workspace__course-list">
                      {evaluatedCourses.map((course, index) => {
                        const rowId = `${componentId}-course-${course.id}`;
                        return (
                          <div className="grade-workspace__course-row" key={course.id}>
                            <div className="grade-workspace__course-fields">
                              <div className="grade-workspace__name-field">
                                <label className="grade-workspace__mobile-label" htmlFor={`${rowId}-name`}>
                                  Course name
                                </label>
                                <div className="grade-workspace__name-wrap">
                                  <span className="grade-workspace__row-index tabular-nums">
                                    {String(index + 1).padStart(2, '0')}
                                  </span>
                                  <input
                                    id={`${rowId}-name`}
                                    type="text"
                                    spellCheck={false}
                                    value={course.name}
                                    onChange={(event) => updateCourse(course.id, 'name', event.target.value)}
                                    placeholder={`Course ${index + 1} (optional)`}
                                    aria-label={`Course ${index + 1} name, optional`}
                                    maxLength={100}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="grade-workspace__mobile-label" htmlFor={`${rowId}-credits`}>
                                  Credits
                                </label>
                                <input
                                  id={`${rowId}-credits`}
                                  type="number"
                                  min={COURSE_CREDIT_MIN}
                                  max={COURSE_CREDIT_MAX}
                                  step="1"
                                  inputMode="numeric"
                                  className="tabular-nums"
                                  value={course.credits}
                                  aria-label={`Course ${index + 1} credit hours`}
                                  aria-invalid={!course.validCredits}
                                  aria-describedby={!course.validCredits ? `${rowId}-error` : undefined}
                                  onChange={(event) => updateCourse(course.id, 'credits', event.target.value)}
                                />
                              </div>

                              <div>
                                <label className="grade-workspace__mobile-label" htmlFor={`${rowId}-grade`}>
                                  Grade
                                </label>
                                <select
                                  id={`${rowId}-grade`}
                                  value={course.grade}
                                  aria-label={`Course ${index + 1} grade`}
                                  onChange={(event) => updateCourse(course.id, 'grade', event.target.value)}
                                >
                                  <option value="">Select</option>
                                  {GRADING_SCALE.map((grade) => (
                                    <option key={grade.letter} value={grade.letter}>
                                      {grade.letter} · {grade.point.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                className="grade-workspace__icon-btn"
                                onClick={() => removeCourse(course.id)}
                                aria-label={`Remove ${course.name || `course ${index + 1}`}`}
                              >
                                <AppIcon name="close" size={18} />
                              </button>
                            </div>

                            <div className="grade-workspace__retake">
                              <label className="grade-workspace__checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={Boolean(course.isRetake)}
                                  onChange={(event) => updateCourse(course.id, 'isRetake', event.target.checked)}
                                />
                                <span>Repeating a previous grade</span>
                              </label>

                              {course.isRetake ? (
                                <label className="grade-workspace__previous-grade">
                                  <span>Replaced grade</span>
                                  <select
                                    value={course.oldGrade}
                                    onChange={(event) => updateCourse(course.id, 'oldGrade', event.target.value)}
                                    aria-label={`Previous replaced grade for ${course.name || `course ${index + 1}`}`}
                                  >
                                    {RETAKE_GRADES.map((g) => (
                                      <option key={g.letter} value={g.letter}>
                                        {g.letter} ({g.point.toFixed(2)})
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}
                            </div>

                            {!course.validCredits ? (
                              <p className="grade-workspace__field-error" id={`${rowId}-error`}>
                                Credits must be a whole number between {COURSE_CREDIT_MIN} and {COURSE_CREDIT_MAX}.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="grade-workspace__empty">
                    <AppIcon name="menu_book" size={28} />
                    <p>No courses added yet. Add a course below to calculate your GPA.</p>
                  </div>
                )}

                <div className="grade-workspace__panel-footer">
                  <button type="button" className="grade-workspace__btn-primary" onClick={() => addCourse()}>
                    <AppIcon name="add" size={18} />
                    <span>Add course</span>
                  </button>

                  <span className="grade-workspace__progress-note tabular-nums">
                    {completedCount} of {courses.length} ready
                  </span>
                </div>
              </section>

              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-record-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-record-title`}>Include previous record</h2>
                    <p>Combine past semesters with this term to estimate your cumulative GPA.</p>
                  </div>

                  <label className="grade-workspace__switch">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={includeHistory}
                      onChange={(event) => setIncludeHistory(event.target.checked)}
                      aria-label="Include previous semesters in CGPA calculation"
                    />
                    <span className="grade-workspace__switch-track" />
                  </label>
                </div>

                {includeHistory ? (
                  <div className="grade-workspace__form-grid">
                    <div>
                      <label className="grade-workspace__label" htmlFor={`${componentId}-hist-gpa`}>
                        Current CGPA
                      </label>
                      <input
                        id={`${componentId}-hist-gpa`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="4"
                        step="0.01"
                        className="tabular-nums"
                        placeholder="e.g. 3.25"
                        value={prevCgpa}
                        onChange={(event) => setPrevCgpa(event.target.value)}
                        aria-invalid={prevCgpa !== '' && !validPreviousGpa}
                      />
                      {prevCgpa !== '' && !validPreviousGpa ? (
                        <p className="grade-workspace__field-error">Enter a CGPA between 0.00 and 4.00.</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="grade-workspace__label" htmlFor={`${componentId}-hist-cr`}>
                        Completed credit hours
                      </label>
                      <input
                        id={`${componentId}-hist-cr`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        className="tabular-nums"
                        placeholder="e.g. 60"
                        value={prevCredits}
                        onChange={(event) => setPrevCredits(event.target.value)}
                        aria-invalid={prevCredits !== '' && !validPreviousCredits}
                      />
                      {prevCredits !== '' && !validPreviousCredits ? (
                        <p className="grade-workspace__field-error">Enter a positive whole number of credit hours.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-trend-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-trend-title`}>Semester GPA history</h2>
                    <p>Save completed semesters to track your GPA trend over time.</p>
                  </div>

                  {sgpa !== null ? (
                    <div className="grade-workspace__save-bar">
                      <input
                        type="text"
                        spellCheck={false}
                        value={semesterLabel}
                        onChange={(event) => setSemesterLabel(event.target.value)}
                        aria-label="Semester label"
                        placeholder="e.g. Fall 2026"
                        maxLength={32}
                      />
                      <button type="button" className="grade-workspace__btn-secondary" onClick={handleSaveSemesterToHistory}>
                        <AppIcon name="save" size={18} />
                        <span className="tabular-nums">Save {sgpa.toFixed(2)}</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                {semesterHistory.length === 0 ? (
                  <p className="grade-workspace__muted-note">
                    No saved semesters yet. Complete your courses above and save your SGPA to start your trend.
                  </p>
                ) : (
                  <div className="grade-workspace__chart-wrap">
                    <div className="grade-workspace__chart-guides tabular-nums" aria-hidden="true">
                      {CHART_GUIDES.map((mark) => (
                        <span key={mark}>{mark.toFixed(1)}</span>
                      ))}
                    </div>
                    <div className="grade-workspace__chart-area">
                      <div
                        className="grade-workspace__chart-bars"
                        style={{
                          gridTemplateColumns: `repeat(${semesterHistory.length}, minmax(3.25rem, 1fr))`,
                        }}
                      >
                        {semesterHistory.map((item) => {
                          const numericSgpa = Number(item.sgpa) || 0;
                          const heightPct = Math.max(8, Math.min(100, (numericSgpa / 4) * 100));
                          return (
                            <div
                              key={item.id}
                              className="grade-workspace__bar-col"
                              title={`${item.label}: ${numericSgpa.toFixed(2)} SGPA (${item.credits} cr)`}
                            >
                              <span className="grade-workspace__bar-value tabular-nums">{numericSgpa.toFixed(2)}</span>
                              <div className="grade-workspace__bar-track">
                                <div className="grade-workspace__bar-fill" style={{ height: `${heightPct}%` }} />
                              </div>
                              <span className="grade-workspace__bar-label">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === 'planner' ? (
            <div
              id={`${componentId}-panel-planner`}
              role="tabpanel"
              aria-labelledby={`${componentId}-tab-planner`}
              className="grade-workspace__tabpanel"
            >
              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-planner-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-planner-title`}>Target CGPA planner</h2>
                    <p>Calculate the credit-weighted SGPA average needed across your remaining credits to reach your goal.</p>
                  </div>
                </div>

                <div className="grade-workspace__form-grid">
                  {plannerFields.map((field) => {
                    const error = field.value !== '' ? targetResult.errors[field.key] : undefined;
                    const fieldId = `${componentId}-${field.id}`;
                    return (
                      <div key={field.key}>
                        <label className="grade-workspace__label" htmlFor={fieldId}>
                          {field.label}
                        </label>
                        <input
                          id={fieldId}
                          type="number"
                          inputMode={field.step === '1' ? 'numeric' : 'decimal'}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className="tabular-nums"
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(event) => field.update(event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${fieldId}-error` : undefined}
                        />
                        {error ? (
                          <p className="grade-workspace__field-error" id={`${fieldId}-error`}>
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}

                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-credit-plan`}>
                      Plan remaining credits by
                    </label>
                    <select
                      id={`${componentId}-credit-plan`}
                      value={creditPlanMode}
                      onChange={(event) => setCreditPlanMode(event.target.value)}
                    >
                      <option value="semesters">Semesters × credits per semester</option>
                      <option value="credits">Total remaining credit hours</option>
                    </select>
                  </div>

                  {creditPlanMode === 'semesters' ? (
                    <div>
                      <label className="grade-workspace__label" htmlFor={`${componentId}-remaining-semesters`}>
                        Remaining semesters
                      </label>
                      <input
                        id={`${componentId}-remaining-semesters`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        className="tabular-nums"
                        value={remainingSemesters}
                        onChange={(event) => setRemainingSemesters(event.target.value)}
                        aria-invalid={remainingSemesters !== '' && !validSemesters}
                        aria-describedby={
                          remainingSemesters !== '' && !validSemesters
                            ? `${componentId}-semesters-error`
                            : undefined
                        }
                      />
                      {remainingSemesters !== '' && !validSemesters ? (
                        <p className="grade-workspace__field-error" id={`${componentId}-semesters-error`}>
                          Enter a positive whole number of semesters.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-upcoming-cr`}>
                      {creditPlanMode === 'semesters'
                        ? 'Credits per remaining semester'
                        : 'Total remaining credit hours'}
                    </label>
                    <input
                      id={`${componentId}-upcoming-cr`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      className="tabular-nums"
                      value={upcomingCredits}
                      onChange={(event) => setUpcomingCredits(event.target.value)}
                      aria-invalid={
                        upcomingCredits !== '' &&
                        (!validUpcomingCredits ||
                          (validSemesters && Boolean(targetResult.errors.remainingCredits)))
                      }
                      aria-describedby={
                        upcomingCredits !== '' &&
                        (!validUpcomingCredits ||
                          (validSemesters && Boolean(targetResult.errors.remainingCredits)))
                          ? `${componentId}-remaining-credits-error`
                          : undefined
                      }
                    />
                    {upcomingCredits !== '' &&
                    (!validUpcomingCredits ||
                      (validSemesters && targetResult.errors.remainingCredits)) ? (
                      <p className="grade-workspace__field-error" id={`${componentId}-remaining-credits-error`}>
                        Enter positive whole-number credit hours within the supported range.
                      </p>
                    ) : null}
                  </div>
                </div>

                <p className="grade-workspace__footnote">
                  Required SGPA is rounded up to two decimals and assumes all remaining credits are new, counted courses. Retakes or excluded credits require separate planning.
                </p>
              </section>
            </div>
          ) : null}

          {activeTab === 'sessional' ? (
            <div
              id={`${componentId}-panel-sessional`}
              role="tabpanel"
              aria-labelledby={`${componentId}-tab-sessional`}
              className="grade-workspace__tabpanel"
            >
              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-sessional-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-sessional-title`}>Subject marks estimator</h2>
                    <p>Theory weights: quizzes 15%, assignments 10%, midterm 25%, and terminal 50%.</p>
                  </div>
                </div>

                <div className="grade-workspace__subject-analyzer">
                  <div className="grade-workspace__subject-fields">
                    <div>
                      <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-subject`}>
                        Subject name
                      </label>
                      <input
                        id={`${componentId}-sessional-subject`}
                        type="text"
                        spellCheck={false}
                        value={sessionalSubjectName}
                        onChange={(event) => setSessionalSubjectName(event.target.value)}
                        placeholder="e.g. Database Systems"
                      />
                    </div>
                    <div>
                      <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-credit-hours`}>
                        Credit hours
                      </label>
                      <input
                        id={`${componentId}-sessional-credit-hours`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="6"
                        step="1"
                        className="tabular-nums"
                        value={sessionalInputs.creditHours}
                        onChange={(event) =>
                          setSessionalInputs((current) => ({ ...current, creditHours: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grade-workspace__image-analyzer">
                    <input
                      ref={sessionalImageInputRef}
                      className="grade-workspace__file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleSessionalImageScan}
                      aria-label="Upload marks screenshot"
                    />
                    <button
                      type="button"
                      className="grade-workspace__btn-secondary"
                      onClick={() => sessionalImageInputRef.current?.click()}
                      disabled={isScanningSubject}
                    >
                      <AppIcon
                        name={isScanningSubject ? 'progress_activity' : 'upload'}
                        className={isScanningSubject ? 'is-spinning' : ''}
                        size={18}
                      />
                      <span>{isScanningSubject ? 'Analyzing…' : 'Analyze marks screenshot'}</span>
                    </button>
                    {scanImageName ? (
                      <small className="grade-workspace__file-name" title={scanImageName}>
                        {scanImageName}
                      </small>
                    ) : (
                      <small>PNG, JPEG, or WebP · up to 3 MB</small>
                    )}
                  </div>
                </div>

                <div className="grade-workspace__form-grid">
                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-quizObtained`}>
                      Quizzes <span className="grade-workspace__label-hint">(out of 15)</span>
                    </label>
                    <input
                      id={`${componentId}-sessional-quizObtained`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="15"
                      step="0.5"
                      className="tabular-nums"
                      value={sessionalInputs.quizObtained}
                      aria-label="Quizzes obtained out of 15"
                      onChange={(event) =>
                        setSessionalInputs((current) => ({ ...current, quizObtained: event.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-assignObtained`}>
                      Assignments <span className="grade-workspace__label-hint">(out of 10)</span>
                    </label>
                    <input
                      id={`${componentId}-sessional-assignObtained`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.5"
                      className="tabular-nums"
                      value={sessionalInputs.assignObtained}
                      aria-label="Assignments obtained out of 10"
                      onChange={(event) =>
                        setSessionalInputs((current) => ({ ...current, assignObtained: event.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-midObtained`}>
                      Midterm <span className="grade-workspace__label-hint">(out of 25)</span>
                    </label>
                    <input
                      id={`${componentId}-sessional-midObtained`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="25"
                      step="0.5"
                      className="tabular-nums"
                      value={sessionalInputs.midObtained}
                      aria-label="Midterm obtained out of 25"
                      onChange={(event) =>
                        setSessionalInputs((current) => ({ ...current, midObtained: event.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="grade-workspace__label" htmlFor={`${componentId}-sessional-finalObtained`}>
                      Terminal / Final <span className="grade-workspace__label-hint">(out of 50)</span>
                    </label>
                    <input
                      id={`${componentId}-sessional-finalObtained`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="50"
                      step="0.5"
                      className="tabular-nums"
                      value={sessionalInputs.finalObtained}
                      aria-label="Final exam obtained out of 50"
                      onChange={(event) =>
                        setSessionalInputs((current) => ({ ...current, finalObtained: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grade-workspace__subpanel">
                  <div className="grade-workspace__subpanel-head">
                    <div>
                      <h3>1-credit lab component</h3>
                      <p>Weighted as assignment 25%, midterm 25%, and final 50%, combined by credit hours.</p>
                    </div>
                    <label className="grade-workspace__switch">
                      <input
                        type="checkbox"
                        checked={sessionalInputs.hasLab}
                        role="switch"
                        onChange={(event) =>
                          setSessionalInputs((current) => ({ ...current, hasLab: event.target.checked }))
                        }
                        aria-label="Include 1-credit lab marks"
                      />
                      <span className="grade-workspace__switch-track" />
                    </label>
                  </div>

                  {sessionalInputs.hasLab ? (
                    <div className="grade-workspace__lab-list">
                      {LAB_COMPONENTS.map(([obtainedKey, totalKey, label, weight]) => (
                        <div className="grade-workspace__lab-row" key={obtainedKey}>
                          <div className="grade-workspace__lab-title">
                            <strong>{label}</strong>
                            <span>{weight} weight</span>
                          </div>
                          <div className="grade-workspace__pair-inputs">
                            <div>
                              <label
                                className="grade-workspace__label"
                                htmlFor={`${componentId}-sessional-${obtainedKey}`}
                              >
                                Obtained
                              </label>
                              <input
                                id={`${componentId}-sessional-${obtainedKey}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max={sessionalInputs[totalKey]}
                                step="0.5"
                                className="tabular-nums"
                                value={sessionalInputs[obtainedKey]}
                                aria-label={`${label} obtained marks`}
                                onChange={(event) =>
                                  setSessionalInputs((current) => ({
                                    ...current,
                                    [obtainedKey]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <span className="grade-workspace__label" aria-hidden="true">Total</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0.5"
                                max="100"
                                step="0.5"
                                className="tabular-nums"
                                value={sessionalInputs[totalKey]}
                                aria-label={`${label} total marks`}
                                onChange={(event) =>
                                  setSessionalInputs((current) => ({
                                    ...current,
                                    [totalKey]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'nat' ? (
            <div
              id={`${componentId}-panel-nat`}
              role="tabpanel"
              aria-labelledby={`${componentId}-tab-nat`}
              className="grade-workspace__tabpanel"
            >
              <section className="grade-workspace__panel" aria-labelledby={`${componentId}-nat-title`}>
                <div className="grade-workspace__panel-head">
                  <div>
                    <h2 id={`${componentId}-nat-title`}>COMSATS NTS NAT aggregate</h2>
                    <p>Weighted as SSC / Matric 10%, HSSC / Intermediate 40%, and NTS NAT 50%.</p>
                  </div>
                </div>

                <div className="grade-workspace__nat-list">
                  {NAT_EXAMS.map(({ exam, label }) => (
                    <fieldset className="grade-workspace__nat-group" key={exam}>
                      <legend>
                        <span>{label}</span>
                        <span className="grade-workspace__weight tabular-nums">
                          {NTS_NAT_WEIGHTS[exam] * 100}% weight
                        </span>
                      </legend>
                      <div className="grade-workspace__pair-inputs">
                        {['Obtained', 'Total'].map((kind) => {
                          const field = `${exam}${kind}`;
                          const fieldId = `${componentId}-${field}`;
                          const error = natInputs[field] !== '' ? natResult.errors[field] : undefined;
                          return (
                            <div key={field}>
                              <label className="grade-workspace__label" htmlFor={fieldId}>
                                {kind} marks
                              </label>
                              <input
                                id={fieldId}
                                type="number"
                                inputMode="decimal"
                                min={kind === 'Total' ? '0.01' : '0'}
                                step="any"
                                className="tabular-nums"
                                value={natInputs[field]}
                                placeholder={kind === 'Obtained' ? 'Your marks' : undefined}
                                onChange={(event) =>
                                  setNatInputs((current) => ({ ...current, [field]: event.target.value }))
                                }
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? `${fieldId}-error` : undefined}
                              />
                              {error ? (
                                <p className="grade-workspace__field-error" id={`${fieldId}-error`}>
                                  {error}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <div className="grade-workspace__info-banner">
                  <AppIcon name="info" size={18} />
                  <p>
                    Architecture and Design use different admission weights, so this NAT formula does not apply to those programmes. Closing merit varies by campus, programme, and admission round.
                  </p>
                </div>
              </section>
            </div>
          ) : null}

          <details className="grade-workspace__reference">
            <summary>
              <span className="grade-workspace__reference-title">
                <AppIcon name="menu_book" size={18} />
                <span>COMSATS grade-point reference</span>
              </span>
              <AppIcon name="expand_more" className="grade-workspace__chevron" size={18} />
            </summary>

            <div className="grade-workspace__reference-body">
              <div className="grade-workspace__grade-grid tabular-nums">
                {GRADING_SCALE.map((grade) => (
                  <div className="grade-workspace__grade-cell" key={grade.letter}>
                    <strong>{grade.letter}</strong>
                    <span>{grade.point.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <p className="grade-workspace__reference-note">
                Values follow COMSATS University’s official grading scale. Confirm applicable rules against your campus academic record.
              </p>
            </div>
          </details>
        </div>

        <aside className="grade-workspace__aside" aria-label="Calculation summary">
          {activeTab === 'semester' ? (
            <section className="grade-workspace__result-card" aria-labelledby={`${componentId}-result-title`}>
              <h2 id={`${componentId}-result-title`}>Semester GPA</h2>

              <div className="grade-workspace__score tabular-nums" aria-live="polite" aria-atomic="true">
                <strong>{formatGpa(sgpa)}</strong>
                <span>/ 4.00</span>
              </div>

              <div
                className="grade-workspace__meter"
                role="progressbar"
                aria-label="Semester GPA out of 4.00"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={sgpa !== null ? Number(sgpa.toFixed(2)) : 0}
              >
                <span style={{ width: `${sgpaProgress}%` }} />
              </div>

              <div className="grade-workspace__meter-scale tabular-nums" aria-hidden="true">
                <span>0.00</span>
                <span>2.00</span>
                <span>4.00</span>
              </div>

              <p className="grade-workspace__status">{statusText}</p>

              <dl className="grade-workspace__breakdown tabular-nums">
                <div>
                  <dt>Completed courses</dt>
                  <dd>{completedCount} / {courses.length}</dd>
                </div>
                <div>
                  <dt>Semester credits</dt>
                  <dd>{ready ? totalCredits : '—'}</dd>
                </div>
                <div>
                  <dt>Quality points</dt>
                  <dd>{ready ? totalQualityPoints.toFixed(2) : '—'}</dd>
                </div>
              </dl>

              {includeHistory ? (
                <div className="grade-workspace__highlight-box">
                  <div className="grade-workspace__highlight-row tabular-nums">
                    <span>Estimated CGPA</span>
                    <strong aria-live="polite">{formatGpa(cgpa)}</strong>
                  </div>
                  <p>
                    {cgpa !== null
                      ? `${netCombinedCredits} combined credit hours${retakeCredits > 0 ? ` (${retakeCredits} retake cr replaced)` : ''}.`
                      : 'Complete your courses and previous academic record.'}
                  </p>
                </div>
              ) : null}

              <button type="button" className="grade-workspace__btn-ghost" onClick={resetCalculator}>
                <AppIcon name="restart_alt" size={18} />
                <span>Reset calculator</span>
              </button>
            </section>
          ) : null}

          {activeTab === 'planner' ? (
            <section
              className="grade-workspace__result-card"
              data-status={targetResult.status}
              aria-labelledby={`${componentId}-planner-result-title`}
            >
              <h2 id={`${componentId}-planner-result-title`}>
                {targetResult.status === 'impossible'
                  ? 'Target exceeds 4.00'
                  : targetResult.status === 'achieved'
                    ? 'Target secured'
                    : 'Required future SGPA'}
              </h2>

              <div className="grade-workspace__score tabular-nums" role="status" aria-live="polite" aria-atomic="true">
                <strong>{requiredDisplay}</strong>
                <span>/ 4.00</span>
              </div>

              <div
                className="grade-workspace__meter"
                role="progressbar"
                aria-label="Required SGPA out of 4.00"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={
                  targetResult.status === 'invalid'
                    ? 0
                    : Math.min(4, Math.max(0, Number(targetResult.requiredSgpa.toFixed(2))))
                }
              >
                <span style={{ width: `${requiredProgress}%` }} />
              </div>

              <div className="grade-workspace__meter-scale tabular-nums" aria-hidden="true">
                <span>0.00</span>
                <span>2.00</span>
                <span>4.00</span>
              </div>

              <p className="grade-workspace__status">
                {targetResult.status === 'invalid'
                  ? 'Enter your current CGPA, completed credits, target CGPA, and remaining credits to calculate.'
                  : targetResult.status === 'impossible'
                    ? `A ${parsedTarget.toFixed(2)} target cannot be reached within ${remainingCreditCount} remaining credits. Even a 4.00 average yields a ${targetResult.maximumCgpa.toFixed(2)} CGPA.`
                    : targetResult.status === 'achieved'
                      ? `Your current quality points already secure a ${parsedTarget.toFixed(2)} CGPA across ${remainingCreditCount} remaining credits.`
                      : `${previousGpa >= parsedTarget ? 'Maintain' : 'Aim for'} at least a ${requiredDisplay} credit-weighted average across ${remainingCreditCount} remaining credits.`}
              </p>

              <dl className="grade-workspace__breakdown tabular-nums">
                <div>
                  <dt>Current CGPA</dt>
                  <dd>{validPreviousGpa ? previousGpa.toFixed(2) : '—'}</dd>
                </div>
                <div>
                  <dt>Remaining credits</dt>
                  <dd>{remainingCreditCount !== null ? remainingCreditCount : '—'}</dd>
                </div>
                {targetResult.status !== 'invalid' && Number.isFinite(targetResult.maximumCgpa) ? (
                  <div>
                    <dt>Max possible CGPA</dt>
                    <dd>{targetResult.maximumCgpa.toFixed(2)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {activeTab === 'sessional' ? (
            <section className="grade-workspace__result-card" aria-labelledby={`${componentId}-sessional-result-title`}>
              <h2 id={`${componentId}-sessional-result-title`}>Estimated subject grade</h2>

              <div className="grade-workspace__score tabular-nums" aria-live="polite" aria-atomic="true">
                <strong>{sessionalResult.letter}</strong>
                <span>{sessionalResult.point.toFixed(2)} GPA</span>
              </div>

              <div
                className="grade-workspace__meter"
                role="progressbar"
                aria-label="Combined course percentage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sessionalPct)}
              >
                <span style={{ width: `${sessionalPct}%` }} />
              </div>

              <div className="grade-workspace__meter-scale tabular-nums" aria-hidden="true">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>

              <p className="grade-workspace__status">
                {sessionalInputs.hasLab
                  ? `Theory ${sessionalResult.theoryPct}% and lab ${sessionalResult.labPct}% combined by credit hours.`
                  : `Your estimated subject GPA is ${sessionalResult.point.toFixed(2)} on the COMSATS 4.00 scale.`}
              </p>

              <dl className="grade-workspace__breakdown tabular-nums">
                <div>
                  <dt>Combined score</dt>
                  <dd>{sessionalResult.combinedPct}%</dd>
                </div>
                <div>
                  <dt>Theory score</dt>
                  <dd>{sessionalResult.theoryPct}%</dd>
                </div>
                {sessionalInputs.hasLab ? (
                  <div>
                    <dt>Lab score</dt>
                    <dd>{sessionalResult.labPct}%</dd>
                  </div>
                ) : null}
              </dl>

              <button
                type="button"
                className="grade-workspace__btn-primary grade-workspace__btn-full"
                onClick={handleApplySessionalToCourses}
              >
                <AppIcon name="playlist_add" size={18} />
                <span>Add to semester courses</span>
              </button>
            </section>
          ) : null}

          {activeTab === 'nat' ? (
            <section className="grade-workspace__result-card" aria-labelledby={`${componentId}-nat-result-title`}>
              <h2 id={`${componentId}-nat-result-title`}>Admission aggregate</h2>

              <div className="grade-workspace__score tabular-nums" role="status" aria-live="polite" aria-atomic="true">
                <strong>
                  {natResult.status === 'valid' ? `${natResult.aggregate.toFixed(2)}%` : '—'}
                </strong>
                <span>/ 100%</span>
              </div>

              <p className="grade-workspace__status">
                {natResult.status === 'valid'
                  ? 'Weighted percentage estimate. Not a merit-list guarantee.'
                  : 'Enter valid marks for all three exams to calculate your aggregate.'}
              </p>

              {natResult.status === 'valid' ? (
                <dl className="grade-workspace__nat-breakdown tabular-nums">
                  {NAT_EXAMS.map(({ exam, label }) => {
                    const maxWeight = NTS_NAT_WEIGHTS[exam] * 100;
                    const contribution = natResult.contributions[exam];
                    const fillPct = Math.min(100, Math.max(0, (contribution / maxWeight) * 100));
                    return (
                      <div key={exam} className="grade-workspace__nat-row">
                        <div className="grade-workspace__nat-row-head">
                          <dt>{label}</dt>
                          <dd>{contribution.toFixed(2)} / {maxWeight}</dd>
                        </div>
                        <div
                          className="grade-workspace__meter grade-workspace__meter--thin"
                          role="progressbar"
                          aria-label={`${label} contribution out of ${maxWeight} percentage points`}
                          aria-valuemin={0}
                          aria-valuemax={maxWeight}
                          aria-valuenow={Number(contribution.toFixed(2))}
                        >
                          <span style={{ width: `${fillPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
            </section>
          ) : null}

          <div className="grade-workspace__formula">
            <AppIcon name="sigma" size={18} />
            <div>
              <strong>How GPA is calculated</strong>
              <p>
                Multiply each course’s grade point by its credit hours, sum the results, and divide by total credits.
              </p>
            </div>
          </div>

          <p className="grade-workspace__disclaimer">
            Planning estimate only, not an official transcript. Official CGPA may differ due to rounding or campus academic policies.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function GpaCalculatorPage() {
  return <GpaCalculator />;
}
