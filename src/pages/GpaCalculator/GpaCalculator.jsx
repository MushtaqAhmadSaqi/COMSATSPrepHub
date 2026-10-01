import React, { useId, useRef, useState } from 'react';
import { GRADING_SCALE } from '../../services/gpaEngine';
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

  const [courses, setCourses] = useState([createCourse(1)]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');

  const evaluatedCourses = courses.map(course => {
    const credits = parseNumber(course.credits);
    const grade = GRADING_SCALE.find(item => item.letter === course.grade);

    // This editor accepts positive whole-number course credit hours.
    const validCredits =
      credits !== null &&
      Number.isInteger(credits) &&
      credits > 0;

    return {
      ...course,
      parsedCredits: credits,
      gradeInfo: grade,
      validCredits,
      complete: validCredits && Boolean(grade),
    };
  });

  const completedCourses = evaluatedCourses.filter(course => course.complete);
  const hasInvalidCredits = evaluatedCourses.some(
    course => !course.validCredits
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

  const cgpa =
    includeHistory && ready && historyReady
      ? (
          previousGpa * previousCreditCount +
          totalQualityPoints
        ) / (previousCreditCount + totalCredits)
      : null;

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
    setCourses(current =>
      current.map(course =>
        course.id === id ? { ...course, [field]: value } : course
      )
    );
  }

  function addCourse() {
    const id = nextId.current++;
    setCourses(current => [...current, createCourse(id)]);
  }

  function removeCourse(id) {
    setCourses(current => current.filter(course => course.id !== id));
  }

  function resetCalculator() {
    const id = nextId.current++;
    setCourses([createCourse(id)]);
    setPrevCgpa('');
    setPrevCredits('');
    setIncludeHistory(false);
  }

  return (
    <main className="grade-workspace">
      <header className="grade-workspace__header">
        <div>
          <p className="grade-workspace__eyebrow">ACADEMIC TOOLS</p>
          <h1>A clearer view of your semester.</h1>
          <p className="grade-workspace__intro">
            Add your courses and grades. We’ll take care of the numbers.
          </p>
        </div>

        <div className="grade-workspace__header-tag">
          <Icon name="calculate" />
          GPA calculator
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
                <p>Use the credit hours and final grade for each course.</p>
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
                            onChange={event =>
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
                          min="1"
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
                          onChange={event =>
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
                          onChange={event =>
                            updateCourse(
                              course.id,
                              'grade',
                              event.target.value
                            )
                          }
                        >
                          <option value="">Select</option>
                          {GRADING_SCALE.map(grade => (
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
                  02 / THE BIGGER PICTURE
                </p>
                <h2 id={`${componentId}-history-title`}>
                  Include previous semesters
                </h2>
                <p>Add your previous record to estimate your CGPA.</p>
              </div>

              <label className="grade-workspace__switch">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={event => setIncludeHistory(event.target.checked)}
                  aria-label="Include previous semesters in CGPA calculation"
                />
                <span className="grade-workspace__switch-track" />
              </label>
            </div>

            {includeHistory && (
              <div className="grade-workspace__history-inputs">
                <div>
                  <label htmlFor={`${componentId}-previous-gpa`}>
                    Previous CGPA
                  </label>

                  <input
                    id={`${componentId}-previous-gpa`}
                    type="number"
                    min="0"
                    max="4"
                    step="0.01"
                    placeholder="e.g. 3.25"
                    value={prevCgpa}
                    onChange={event => setPrevCgpa(event.target.value)}
                    aria-invalid={prevCgpa !== '' && !validPreviousGpa}
                    aria-describedby={
                      prevCgpa !== '' && !validPreviousGpa
                        ? `${componentId}-previous-gpa-error`
                        : undefined
                    }
                  />

                  {prevCgpa !== '' && !validPreviousGpa && (
                    <p
                      className="grade-workspace__field-error"
                      id={`${componentId}-previous-gpa-error`}
                    >
                      Enter a CGPA between 0 and 4.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${componentId}-previous-credits`}>
                    Previous GPA credit hours
                  </label>

                  <input
                    id={`${componentId}-previous-credits`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 60"
                    value={prevCredits}
                    onChange={event => setPrevCredits(event.target.value)}
                    aria-invalid={
                      prevCredits !== '' && !validPreviousCredits
                    }
                    aria-describedby={
                      prevCredits !== '' && !validPreviousCredits
                        ? `${componentId}-previous-credits-error`
                        : undefined
                    }
                  />

                  {prevCredits !== '' && !validPreviousCredits && (
                    <p
                      className="grade-workspace__field-error"
                      id={`${componentId}-previous-credits-error`}
                    >
                      Enter a positive whole number.
                    </p>
                  )}
                </div>

                <p className="grade-workspace__history-help">
                  Use the previous credit hours included in your GPA calculation.
                  Repeated courses or grade replacements may require adjustments.
                </p>
              </div>
            )}
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
              {GRADING_SCALE.map(grade => (
                <div key={grade.letter}>
                  <strong>{grade.letter}</strong>
                  <span>{grade.point.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <p>
              Values come from this app’s configured grading scale. Confirm
              the applicable rules against your academic record.
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
                    ? `${previousCreditCount + totalCredits} combined credit hours`
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
    </main>
  );
}