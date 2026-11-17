import React, { useId, useRef, useState } from 'react';
import { GRADING_SCALE, calcSessionalCourseResult, COURSE_CREDIT_MIN, COURSE_CREDIT_MAX, isValidCourseCredits, calculateRequiredSgpa, calculateNtsAggregate, NTS_NAT_WEIGHTS } from '../../services/gpaEngine';
import { getSemesterGpaHistory, saveSemesterGpaEntry } from '../../utils/studyTracker';
import { useToast } from '../../utils/toast';
import './GpaCalculator.css';

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

function createCourse(id) {
  return {
    id,
    name: '',
    credits: '3',
    grade: '',
    isRetake: false,
    oldGrade: 'F'
  };
}

function parseNumber(value) {
  if (String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatGpa(value) {
  return value === null ? '—' : value.toFixed(2);
}

export default function GpaCalculator() {
  const componentId = useId();
  const nextId = useRef(2);
  const toast = useToast();

  const [courses, setCourses] = useState([createCourse(1)]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');

  const [targetCgpa, setTargetCgpa] = useState('3.50');
  const [upcomingCredits, setUpcomingCredits] = useState('15');
  const [remainingSemesters, setRemainingSemesters] = useState('1');
  const [creditPlanMode, setCreditPlanMode] = useState('semesters');
  const [natInputs, setNatInputs] = useState({
    matricObtained: '', matricTotal: '1100',
    hsscObtained: '', hsscTotal: '1100',
    natObtained: '', natTotal: '100'
  });
  const natResult = calculateNtsAggregate(Object.fromEntries(
    Object.entries(natInputs).map(([field, value]) => [field, parseNumber(value)])
  ));

  // Semester history chart state
  const [semesterHistory, setSemesterHistory] = useState(() => getSemesterGpaHistory());
  const [semesterLabel, setSemesterLabel] = useState('Current Sem');

  // Internal Sessional Marks Estimator state (Quizzes 15%, Assignments 10%, Midterm 25%, Final 50% + optional Lab)
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
    creditHours: '3'
  });
  const sessionalResult = calcSessionalCourseResult(sessionalInputs);

  const evaluatedCourses = courses.map((course) => {
    const credits = parseNumber(course.credits);
    const grade = GRADING_SCALE.find((item) => item.letter === course.grade);
    const oldGradeInfo = GRADING_SCALE.find((item) => item.letter === course.oldGrade);

    const validCredits = isValidCourseCredits(credits);

    return {
      ...course,
      parsedCredits: credits,
      gradeInfo: grade,
      oldGradeInfo,
      validCredits,
      complete: validCredits && Boolean(grade),
    };
  });

  const completedCourses = evaluatedCourses.filter((course) => course.complete);
  const hasInvalidCredits = evaluatedCourses.some(
    (course) => !course.validCredits
  );

  const ready =
    courses.length > 0 &&
    completedCourses.length === courses.length;

  const totalCredits = completedCourses.reduce(
    (sum, course) => sum + course.parsedCredits,
    0
  );

  const totalQualityPoints = completedCourses.reduce(
    (sum, course) =>
      sum + course.parsedCredits * course.gradeInfo.point,
    0
  );

  const sgpa = ready ? totalQualityPoints / totalCredits : null;

  const previousGpa = parseNumber(prevCgpa);
  const previousCreditCount = parseNumber(prevCredits);

  const validPreviousGpa =
    previousGpa !== null &&
    previousGpa >= 0 &&
    previousGpa <= 4;

  const validPreviousCredits =
    previousCreditCount !== null &&
    Number.isInteger(previousCreditCount) &&
    previousCreditCount > 0;

  const historyReady = validPreviousGpa && validPreviousCredits;

  // Retake-aware CGPA calculation:
  // If a course is marked as a retake, its credits were already counted in previousCreditCount,
  // so we replace the old grade's quality points with the new grade's quality points.
  const retakeCredits = completedCourses
    .filter((c) => c.isRetake)
    .reduce((sum, c) => sum + c.parsedCredits, 0);

  const retakeOldQualityPoints = completedCourses
    .filter((c) => c.isRetake)
    .reduce((sum, c) => sum + c.parsedCredits * (c.oldGradeInfo?.point ?? 0), 0);

  const netCombinedCredits =
    historyReady
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
  const remainingCreditCount = creditPlanMode === 'semesters'
    ? validSemesters && validUpcomingCredits ? parsedSemesters * parsedUpcomingCr : null
    : parsedUpcomingCr;
  const targetResult = calculateRequiredSgpa({
    currentCgpa: previousGpa,
    completedCredits: previousCreditCount,
    remainingCredits: remainingCreditCount,
    targetCgpa: parsedTarget
  });
  const plannerFields = [
    { key: 'currentCgpa', id: 'previous-gpa', label: 'Current CGPA', value: prevCgpa, update: setPrevCgpa, min: 0, max: 4, step: '0.01', placeholder: 'e.g. 3.25' },
    { key: 'completedCredits', id: 'previous-credits', label: 'Completed credit hours', value: prevCredits, update: setPrevCredits, min: 1, step: '1', placeholder: 'e.g. 60' },
    { key: 'targetCgpa', id: 'target-cgpa', label: 'Target CGPA', value: targetCgpa, update: setTargetCgpa, min: 0, max: 4, step: '0.01' }
  ];

  const progress = sgpa === null ? 0 : (sgpa / 4) * 100;

  let statusText = 'Choose a grade for each course to see your result.';

  if (courses.length === 0) {
    statusText = 'Add your first course to get started.';
  } else if (hasInvalidCredits) {
    statusText = 'Enter positive whole-number credits for every course.';
  } else if (ready) {
    statusText = `Calculated from ${courses.length} ${
      courses.length === 1 ? 'course' : 'courses'
    } and ${totalCredits} credit hours.`;
  }

  function updateCourse(id, field, value) {
    setCourses((current) =>
      current.map((course) =>
        course.id === id ? { ...course, [field]: value } : course
      )
    );
  }

  function addCourse() {
    const id = nextId.current++;
    setCourses((current) => [...current, createCourse(id)]);
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
  }

  function handleSaveSemesterToHistory() {
    if (sgpa === null) return;
    const next = saveSemesterGpaEntry({
      label: semesterLabel || `Sem ${semesterHistory.length + 1}`,
      sgpa,
      credits: totalCredits
    });
    setSemesterHistory(next);
    toast.success('Semester SGPA saved to your history chart!');
  }

  function handleExportPrint() {
    window.print();
  }

  return (
    <div className="grade-workspace">
      <header className="grade-workspace__header">
        <div>
          <p className="grade-workspace__eyebrow">ACADEMIC TOOLS</p>
          <h1>A clearer view of your semester.</h1>
          <p className="grade-workspace__intro">
            Add your courses, credit hours, and grades — including course retakes and target CGPA planning.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="grade-workspace__header-tag"
            onClick={handleExportPrint}
            style={{ cursor: 'pointer', border: '1px solid var(--gw-line)' }}
          >
            <Icon name="print" />
            Export PDF / Print
          </button>
        </div>
      </header>

      <div className="grade-workspace__layout">
        <div className="grade-workspace__editor">
          <section
            className="grade-workspace__panel"
            aria-labelledby={`${componentId}-courses-title`}
          >
            <div className="grade-workspace__panel-heading">
              <div>
                <p className="grade-workspace__section-label">01 / THIS SEMESTER</p>
                <h2 id={`${componentId}-courses-title`}>Your courses</h2>
                <p>Use the credit hours and final grade for each course. Toggle &ldquo;Retake&rdquo; if repeating a course.</p>
              </div>

              <span className="grade-workspace__count">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'}
              </span>
            </div>

            <div className="grade-workspace__table-heading" aria-hidden="true">
              <span>Course name</span>
              <span>Credits</span>
              <span>Grade</span>
              <span />
            </div>

            <div className="grade-workspace__course-list">
              {evaluatedCourses.map((course, index) => {
                const rowId = `${componentId}-course-${course.id}`;

                return (
                  <div className="grade-workspace__course" key={course.id}>
                    <div className="grade-workspace__course-fields">
                      <div className="grade-workspace__name-field">
                        <label
                          className="grade-workspace__mobile-label"
                          htmlFor={`${rowId}-name`}
                        >
                          Course name
                        </label>

                        <div className="grade-workspace__name-wrap">
                          <span className="grade-workspace__row-number">
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          <input
                            id={`${rowId}-name`}
                            type="text"
                            value={course.name}
                            onChange={(event) =>
                              updateCourse(
                                course.id,
                                'name',
                                event.target.value
                              )
                            }
                            placeholder={`Course ${index + 1}`}
                            aria-label={`Course ${index + 1} name, optional`}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="grade-workspace__mobile-label"
                          htmlFor={`${rowId}-credits`}
                        >
                          Credits
                        </label>

                        <input
                          id={`${rowId}-credits`}
                          type="number"
                          min={COURSE_CREDIT_MIN}
                          max={COURSE_CREDIT_MAX}
                          step="1"
                          inputMode="numeric"
                          value={course.credits}
                          aria-label={`Course ${index + 1} credit hours`}
                          aria-invalid={!course.validCredits}
                          aria-describedby={
                            !course.validCredits
                              ? `${rowId}-error`
                              : undefined
                          }
                          onChange={(event) =>
                            updateCourse(
                              course.id,
                              'credits',
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="grade-workspace__mobile-label"
                          htmlFor={`${rowId}-grade`}
                        >
                          Grade
                        </label>

                        <select
                          id={`${rowId}-grade`}
                          value={course.grade}
                          aria-label={`Course ${index + 1} grade`}
                          onChange={(event) =>
                            updateCourse(
                              course.id,
                              'grade',
                              event.target.value
                            )
                          }
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
                        className="grade-workspace__remove"
                        onClick={() => removeCourse(course.id)}
                        aria-label={`Remove ${course.name || `course ${index + 1}`}`}
                      >
                        <Icon name="close" />
                      </button>
                    </div>

                    {/* Retake / Course Repeat Option */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginTop: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'var(--gw-muted)'
                      }}
                    >
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(course.isRetake)}
                          onChange={(e) => updateCourse(course.id, 'isRetake', e.target.checked)}
                        />
                        Repeating / improving previous grade?
                      </label>

                      {course.isRetake && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          Previous grade replaced:
                          <select
                            value={course.oldGrade}
                            onChange={(e) => updateCourse(course.id, 'oldGrade', e.target.value)}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--gw-line)',
                              background: 'var(--gw-surface)',
                              color: 'var(--gw-text)',
                              fontSize: '0.75rem'
                            }}
                          >
                            {GRADING_SCALE.slice(5).map((g) => (
                              <option key={g.letter} value={g.letter}>
                                {g.letter} ({g.point.toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    {!course.validCredits && (
                      <p
                        className="grade-workspace__field-error"
                        id={`${rowId}-error`}
                      >
                        Credits must be a positive whole number.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {courses.length === 0 && (
              <div className="grade-workspace__empty">
                <Icon name="menu_book" />
                <p>No courses yet. Add one below to begin.</p>
              </div>
            )}

            <div className="grade-workspace__editor-footer">
              <button
                type="button"
                className="grade-workspace__add"
                onClick={addCourse}
              >
                <Icon name="add" />
                Add course
              </button>

              <span>
                {completedCourses.length} of {courses.length} completed
              </span>
            </div>
          </section>

          <section
            className="grade-workspace__panel grade-workspace__history"
            aria-labelledby={`${componentId}-history-title`}
          >
            <div className="grade-workspace__history-heading">
              <div>
                <p className="grade-workspace__section-label">
                  02 / THE BIGGER PICTURE &amp; TARGET CGPA
                </p>
                <h2 id={`${componentId}-history-title`}>
                  Target CGPA planner
                </h2>
                <p>Plan across all remaining credits. The switch also includes your previous record in this semester’s CGPA estimate.</p>
              </div>

              <label className="grade-workspace__switch">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={(event) => setIncludeHistory(event.target.checked)}
                  aria-label="Include previous semesters in CGPA calculation"
                />
                <span className="grade-workspace__switch-track" />
              </label>
            </div>

            <div className="grade-workspace__history-inputs">
              {plannerFields.map((field) => {
                const error = field.value !== '' ? targetResult.errors[field.key] : undefined;
                const fieldId = `${componentId}-${field.id}`;
                return (
                  <div key={field.key}>
                    <label htmlFor={fieldId}>{field.label}</label>
                    <input
                      id={fieldId}
                      type="number"
                      inputMode={field.step === '1' ? 'numeric' : 'decimal'}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(event) => field.update(event.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${fieldId}-error` : undefined}
                    />
                    {error && <p className="grade-workspace__field-error" id={`${fieldId}-error`}>{error}</p>}
                  </div>
                );
              })}
              <div>
                <label htmlFor={`${componentId}-credit-plan`}>Plan remaining credits by</label>
                <select id={`${componentId}-credit-plan`} value={creditPlanMode} onChange={(event) => setCreditPlanMode(event.target.value)}>
                  <option value="semesters">Semesters × credits per semester</option>
                  <option value="credits">Total remaining credit hours</option>
                </select>
              </div>
              {creditPlanMode === 'semesters' && (
                <div>
                  <label htmlFor={`${componentId}-remaining-semesters`}>Remaining semesters</label>
                  <input
                    id={`${componentId}-remaining-semesters`}
                    type="number" inputMode="numeric" min="1" step="1"
                    value={remainingSemesters}
                    onChange={(event) => setRemainingSemesters(event.target.value)}
                    aria-invalid={remainingSemesters !== '' && !validSemesters}
                    aria-describedby={remainingSemesters !== '' && !validSemesters ? `${componentId}-semesters-error` : undefined}
                  />
                  {remainingSemesters !== '' && !validSemesters && <p className="grade-workspace__field-error" id={`${componentId}-semesters-error`}>Enter a positive whole number of semesters.</p>}
                </div>
              )}
              <div>
                <label htmlFor={`${componentId}-upcoming-cr`}>{creditPlanMode === 'semesters' ? 'Credits per remaining semester' : 'Total remaining credit hours'}</label>
                <input
                  id={`${componentId}-upcoming-cr`}
                  type="number" inputMode="numeric" min="1" step="1"
                  value={upcomingCredits}
                  onChange={(event) => setUpcomingCredits(event.target.value)}
                  aria-invalid={upcomingCredits !== '' && (!validUpcomingCredits || (validSemesters && Boolean(targetResult.errors.remainingCredits)))}
                  aria-describedby={upcomingCredits !== '' && (!validUpcomingCredits || (validSemesters && Boolean(targetResult.errors.remainingCredits))) ? `${componentId}-remaining-credits-error` : undefined}
                />
                {upcomingCredits !== '' && (!validUpcomingCredits || (validSemesters && targetResult.errors.remainingCredits)) && <p className="grade-workspace__field-error" id={`${componentId}-remaining-credits-error`}>Enter positive whole-number credit hours within the supported numeric range.</p>}
              </div>
              <div className="grade-workspace__planner-result" data-status={targetResult.status} role="status" aria-atomic="true">
                {targetResult.status === 'invalid' ? (
                  <p>Complete a valid academic record, target, and remaining-credit plan to see your required future SGPA.</p>
                ) : (
                  <>
                    <span>{targetResult.status === 'impossible' ? 'Target exceeds the 4.00 scale' : targetResult.status === 'achieved' ? 'Target already secured' : 'Required future average SGPA'}</span>
                    <strong>{targetResult.status === 'impossible' ? targetResult.requiredSgpa.toFixed(2) : (Math.ceil(targetResult.requiredSgpa * 100 - 1e-9) / 100).toFixed(2)} <small>/ 4.00</small></strong>
                    <p>
                      {targetResult.status === 'impossible'
                        ? `A ${parsedTarget.toFixed(2)} target is not achievable within these ${remainingCreditCount} remaining credits. Even a 4.00 future average gives a maximum CGPA of ${targetResult.maximumCgpa.toFixed(2)}.`
                        : targetResult.status === 'achieved'
                          ? `Your existing quality points already secure a ${parsedTarget.toFixed(2)} target across these ${remainingCreditCount} remaining credits, even with a 0.00 future average.`
                          : `${previousGpa >= parsedTarget ? 'Your current CGPA meets the target, but you must maintain' : 'To reach the target, aim for'} at least this credit-weighted average across ${remainingCreditCount} remaining credits.`}
                    </p>
                  </>
                )}
              </div>
              <p className="grade-workspace__planner-note">Required SGPA is rounded up to two decimals. Assumes all remaining credits are new, counted courses; retakes or excluded credits need separate planning.</p>
            </div>
          </section>

          {/* Semester History Chart */}
          <section
            className="grade-workspace__panel"
            style={{ marginTop: '1.25rem' }}
            aria-label="Semester GPA history chart"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <p className="grade-workspace__section-label">03 / SEMESTER TREND</p>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0.2rem 0' }}>Semester GPA History</h2>
              </div>
              {sgpa !== null && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={semesterLabel}
                    onChange={(e) => setSemesterLabel(e.target.value)}
                    aria-label="Semester label"
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--gw-line)',
                      background: 'var(--gw-subtle)',
                      color: 'var(--gw-text)',
                      fontSize: '0.8125rem',
                      width: '120px'
                    }}
                  />
                  <button
                    type="button"
                    className="grade-workspace__add"
                    onClick={handleSaveSemesterToHistory}
                  >
                    <Icon name="save" />
                    Save SGPA ({sgpa.toFixed(2)})
                  </button>
                </div>
              )}
            </div>

            {semesterHistory.length === 0 ? (
              <p style={{ color: 'var(--gw-muted)', fontSize: '0.875rem', margin: 0 }}>
                No saved semesters yet. Calculate an SGPA and save it to start your trend.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(1, semesterHistory.length)}, minmax(48px, 1fr))`,
                    gap: '0.75rem',
                    alignItems: 'end',
                    height: '130px',
                    padding: '1rem 0.5rem 0',
                    borderBottom: '1px solid var(--gw-line)'
                  }}
                >
                  {semesterHistory.map((item) => {
                    const heightPct = Math.max(12, Math.min(100, Math.round((item.sgpa / 4) * 100)));
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          gap: '0.35rem'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gw-brand)' }}>
                          {Number(item.sgpa).toFixed(2)}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '42px',
                            height: `${heightPct}%`,
                            background: 'var(--gw-brand)',
                            borderRadius: '6px 6px 0 0'
                          }}
                          title={`${item.label}: ${item.sgpa} SGPA (${item.credits} Cr)`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(1, semesterHistory.length)}, minmax(48px, 1fr))`,
                    gap: '0.75rem',
                    paddingTop: '0.4rem',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--gw-muted)'
                  }}
                >
                  {semesterHistory.map((item) => (
                    <span key={item.id}>{item.label}</span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Internal Course Sessional Marks Estimator */}
          <section
            className="grade-workspace__panel"
            style={{ marginTop: '1.25rem' }}
            aria-label="Course sessional marks to grade estimator"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <p className="grade-workspace__section-label">04 / INTERNAL MARKS ESTIMATOR</p>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0.2rem 0' }}>
                  Calculate subject GPA from marks
                </h2>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--gw-muted)', fontSize: '0.78rem' }}>
                  Theory: quizzes 15%, assignments 10%, midterm 25%, final 50%.
                </p>
              </div>
              <span className="grade-workspace__count" style={{ fontSize: '0.85rem', color: 'var(--gw-brand)' }}>
                {sessionalResult.combinedPct}% → Grade {sessionalResult.letter} ({sessionalResult.point.toFixed(2)})
              </span>
            </div>

            <p style={{ margin: '0.75rem 0 0', color: 'var(--gw-muted)', fontSize: '0.75rem' }}>
              {sessionalInputs.hasLab
                ? `Theory ${sessionalResult.theoryPct}% + lab ${sessionalResult.labPct}% combined by credit hours.`
                : `Your subject GPA is ${sessionalResult.point.toFixed(2)} on the COMSATS 4.00 scale.`}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label htmlFor={`${componentId}-sessional-quizObtained`} style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--gw-muted)', marginBottom: '4px' }}>
                  Quizzes (out of 15)
                </label>
                <input
                  id={`${componentId}-sessional-quizObtained`}
                  type="number"
                  min="0"
                  max="15"
                  step="0.5"
                  value={sessionalInputs.quizObtained}
                  onChange={(e) => setSessionalInputs((s) => ({ ...s, quizObtained: e.target.value }))}
                  aria-label="Quizzes obtained out of 15"
                />
              </div>
              <div>
                <label htmlFor={`${componentId}-sessional-assignObtained`} style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--gw-muted)', marginBottom: '4px' }}>
                  Assignments (out of 10)
                </label>
                <input
                  id={`${componentId}-sessional-assignObtained`}
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={sessionalInputs.assignObtained}
                  onChange={(e) => setSessionalInputs((s) => ({ ...s, assignObtained: e.target.value }))}
                  aria-label="Assignments obtained out of 10"
                />
              </div>
              <div>
                <label htmlFor={`${componentId}-sessional-midObtained`} style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--gw-muted)', marginBottom: '4px' }}>
                  Midterm (out of 25)
                </label>
                <input
                  id={`${componentId}-sessional-midObtained`}
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={sessionalInputs.midObtained}
                  onChange={(e) => setSessionalInputs((s) => ({ ...s, midObtained: e.target.value }))}
                  aria-label="Midterm obtained out of 25"
                />
              </div>
              <div>
                <label htmlFor={`${componentId}-sessional-finalObtained`} style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--gw-muted)', marginBottom: '4px' }}>
                  Terminal / Final (out of 50)
                </label>
                <input
                  id={`${componentId}-sessional-finalObtained`}
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={sessionalInputs.finalObtained}
                  onChange={(e) => setSessionalInputs((s) => ({ ...s, finalObtained: e.target.value }))}
                  aria-label="Final exam obtained out of 50"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.85rem', fontSize: '0.8125rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--gw-muted)' }}>
                <input
                  type="checkbox"
                  checked={sessionalInputs.hasLab}
                  onChange={(e) => setSessionalInputs((s) => ({ ...s, hasLab: e.target.checked }))}
                />
                Include 1-Credit Lab?
              </label>
            </div>

            {sessionalInputs.hasLab && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gw-line)' }}>
                <p style={{ margin: '0 0 0.65rem', color: 'var(--gw-text)', fontSize: '0.82rem', fontWeight: 750 }}>
                  Lab marks <span style={{ color: 'var(--gw-muted)', fontWeight: 500 }}>· assignment 25%, midterm 25%, final 50%</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.75rem' }}>
                  {[
                    ['labAssignObtained', 'Lab assignment', 'labAssignTotal'],
                    ['labMidObtained', 'Lab midterm', 'labMidTotal'],
                    ['labFinalObtained', 'Lab final', 'labFinalTotal']
                  ].map(([obtainedKey, label, totalKey]) => (
                    <div key={obtainedKey}>
                      <label htmlFor={`${componentId}-sessional-${obtainedKey}`} style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--gw-muted)', marginBottom: '4px' }}>
                        {label}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <input
                          id={`${componentId}-sessional-${obtainedKey}`}
                          type="number"
                          min="0"
                          max={sessionalInputs[totalKey]}
                          step="0.5"
                          value={sessionalInputs[obtainedKey]}
                          onChange={(e) => setSessionalInputs((s) => ({ ...s, [obtainedKey]: e.target.value }))}
                          aria-label={`${label} obtained marks`}
                        />
                        <input
                          type="number"
                          min="0.5"
                          max="100"
                          step="0.5"
                          value={sessionalInputs[totalKey]}
                          onChange={(e) => setSessionalInputs((s) => ({ ...s, [totalKey]: e.target.value }))}
                          aria-label={`${label} total marks`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grade-workspace__panel grade-workspace__nat" aria-labelledby={`${componentId}-nat-title`}>
            <div className="grade-workspace__panel-heading">
              <div>
                <p className="grade-workspace__section-label">05 / ADMISSION ESTIMATE</p>
                <h2 id={`${componentId}-nat-title`}>COMSATS NTS NAT aggregate</h2>
                <p>SSC / Matric 10% + HSSC / Intermediate 40% + NTS NAT 50%. Use your actual obtained and total marks.</p>
              </div>
            </div>
            <div className="grade-workspace__nat-inputs">
              {[
                ['matric', 'SSC / Matric'],
                ['hssc', 'HSSC / Intermediate'],
                ['nat', 'NTS NAT']
              ].map(([exam, label]) => (
                <fieldset key={exam}>
                  <legend>{label} <span>· {NTS_NAT_WEIGHTS[exam] * 100}% weight</span></legend>
                  <div>
                    {['Obtained', 'Total'].map((kind) => {
                      const field = `${exam}${kind}`;
                      const fieldId = `${componentId}-${field}`;
                      const error = natInputs[field] !== '' ? natResult.errors[field] : undefined;
                      return (
                        <div key={field}>
                          <label htmlFor={fieldId}>{kind} marks</label>
                          <input
                            id={fieldId} type="number" inputMode="decimal" min={kind === 'Total' ? '0.01' : '0'} step="any"
                            value={natInputs[field]}
                            placeholder={kind === 'Obtained' ? 'Your marks' : undefined}
                            onChange={(event) => setNatInputs((current) => ({ ...current, [field]: event.target.value }))}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${fieldId}-error` : undefined}
                          />
                          {error && <p className="grade-workspace__field-error" id={`${fieldId}-error`}>{error}</p>}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="grade-workspace__nat-result" role="status" aria-atomic="true">
              <span>Estimated admission aggregate</span>
              <strong>{natResult.status === 'valid' ? `${natResult.aggregate.toFixed(2)}%` : '—'}</strong>
              <p>{natResult.status === 'valid' ? 'Weighted percentage, not a merit-list guarantee.' : 'Enter valid marks for all three components to see your aggregate.'}</p>
            </div>
            {natResult.status === 'valid' && (
              <dl className="grade-workspace__nat-breakdown">
                {[
                  ['matric', 'SSC / Matric'], ['hssc', 'HSSC / Intermediate'], ['nat', 'NTS NAT']
                ].map(([exam, label]) => (
                  <div key={exam}>
                    <dt>{label} · {NTS_NAT_WEIGHTS[exam] * 100}% weight</dt>
                    <dd>{natResult.contributions[exam].toFixed(2)} percentage points</dd>
                    <progress max={NTS_NAT_WEIGHTS[exam] * 100} value={natResult.contributions[exam]} aria-label={`${label} contribution out of ${NTS_NAT_WEIGHTS[exam] * 100} percentage points`} />
                  </div>
                ))}
              </dl>
            )}
            <p className="grade-workspace__admission-note"><Icon name="info" /> Architecture and Design use different admission weights; this NAT formula does not apply to those programmes. This is an estimate only. Closing merit varies by campus, programme, and admission round; confirm current rules with COMSATS admissions.</p>
          </section>

          <details className="grade-workspace__reference">
            <summary>
              <span>
                <Icon name="info" />
                Grade-point reference
              </span>
              <Icon name="expand_more" />
            </summary>

            <div className="grade-workspace__grade-grid">
              {GRADING_SCALE.map((grade) => (
                <div key={grade.letter}>
                  <strong>{grade.letter}</strong>
                  <span>{grade.point.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <p>
              Values come from COMSATS University’s official grading scale. Confirm
              the applicable rules against your campus academic record.
            </p>
          </details>
        </div>

        <aside className="grade-workspace__results">
          <section
            className="grade-workspace__result-card"
            aria-labelledby={`${componentId}-result-title`}
          >
            <div className="grade-workspace__result-top">
              <p className="grade-workspace__section-label">YOUR RESULT</p>
              <span className="grade-workspace__live">
                <span />
                Live calculation
              </span>
            </div>

            <h2 id={`${componentId}-result-title`}>Semester GPA</h2>

            <div
              className="grade-workspace__score"
              aria-live="polite"
              aria-atomic="true"
            >
              <strong>{formatGpa(sgpa)}</strong>
              <span>/ 4.00</span>
            </div>

            <div className="grade-workspace__meter" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="grade-workspace__meter-labels" aria-hidden="true">
              <span>0.00</span>
              <span>4.00</span>
            </div>

            <p className="grade-workspace__status">{statusText}</p>

            <dl className="grade-workspace__breakdown">
              <div>
                <dt>Completed entries</dt>
                <dd>{completedCourses.length} / {courses.length}</dd>
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

            {includeHistory && (
              <div className="grade-workspace__cumulative">
                <div>
                  <span>Estimated cumulative GPA</span>
                  <strong aria-live="polite">{formatGpa(cgpa)}</strong>
                </div>

                <p>
                  {cgpa !== null
                    ? `${netCombinedCredits} combined credit hours${retakeCredits > 0 ? ` (${retakeCredits} retake cr replaced)` : ''}`
                    : 'Complete your courses and previous academic record.'}
                </p>
              </div>
            )}

            <button
              type="button"
              className="grade-workspace__reset"
              onClick={resetCalculator}
            >
              <Icon name="restart_alt" />
              Reset calculator
            </button>
          </section>

          <div className="grade-workspace__formula">
            <Icon name="functions" />
            <div>
              <strong>How it is calculated</strong>
              <p>
                Multiply each grade point by its course credits. Add those
                values, then divide by the total credits.
              </p>
            </div>
          </div>

          <p className="grade-workspace__disclaimer">
            A planning estimate, not an official transcript. CGPA may differ
            when previous results are rounded or special academic rules apply.
          </p>
        </aside>
      </div>
    </div>
  );
}