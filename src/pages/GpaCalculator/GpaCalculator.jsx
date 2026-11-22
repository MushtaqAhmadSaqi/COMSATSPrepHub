import React, { useEffect, useId, useRef, useState } from "react";
import "./GpaCalculator.css";
import { authHelper } from "../../services/supabase";

/**
 * Self-contained COMSATS GPA & Academic Engine
 * Includes official COMSATS grading scale, sessional marks estimator,
 * target CGPA planner, NTS NAT aggregate calculator, and localStorage history.
 */
const COURSE_CREDIT_MIN = 1;
const COURSE_CREDIT_MAX = 6;

const GRADING_SCALE = [
  { letter: "A", point: 4.0, minPct: 85 },
  { letter: "A-", point: 3.66, minPct: 80 },
  { letter: "B+", point: 3.33, minPct: 75 },
  { letter: "B", point: 3.0, minPct: 71 },
  { letter: "B-", point: 2.66, minPct: 68 },
  { letter: "C+", point: 2.33, minPct: 64 },
  { letter: "C", point: 2.0, minPct: 61 },
  { letter: "C-", point: 1.66, minPct: 58 },
  { letter: "D+", point: 1.33, minPct: 54 },
  { letter: "D", point: 1.0, minPct: 50 },
  { letter: "F", point: 0.0, minPct: 0 },
];

const NTS_NAT_WEIGHTS = {
  matric: 0.1,
  hssc: 0.4,
  nat: 0.5,
};

const GRADE_BY_LETTER = new Map(
  GRADING_SCALE.map((item) => [item.letter, item]),
);
const RETAKE_GRADES = GRADING_SCALE.slice(5);
const STORAGE_KEY = "comsats_semester_gpa_history_v1";

const WORKSPACE_TABS = [
  { id: "semester", label: "Semester GPA", icon: "school" },
  { id: "planner", label: "Target CGPA", icon: "target" },
  { id: "sessional", label: "Subject marks", icon: "calculator" },
  { id: "nat", label: "NAT aggregate", icon: "check" },
];

const SESSIONAL_THEORY_FIELDS = [
  { key: "quizObtained", label: "Quizzes", max: 15 },
  { key: "assignObtained", label: "Assignments", max: 10 },
  { key: "midObtained", label: "Midterm", max: 25 },
  { key: "finalObtained", label: "Terminal / Final", max: 50 },
];

const SESSIONAL_LAB_FIELDS = [
  {
    obtainedKey: "labAssignObtained",
    totalKey: "labAssignTotal",
    label: "Lab assignment",
    weight: "25%",
  },
  {
    obtainedKey: "labMidObtained",
    totalKey: "labMidTotal",
    label: "Lab midterm",
    weight: "25%",
  },
  {
    obtainedKey: "labFinalObtained",
    totalKey: "labFinalTotal",
    label: "Lab final",
    weight: "50%",
  },
];

const NAT_EXAMS = [
  { exam: "matric", label: "SSC / Matric" },
  { exam: "hssc", label: "HSSC / Intermediate" },
  { exam: "nat", label: "NTS NAT" },
];

const CHART_GUIDES = [4, 3, 2, 1];

function isValidCourseCredits(value) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= COURSE_CREDIT_MIN &&
    value <= COURSE_CREDIT_MAX
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value) {
  if (String(value ?? "").trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatGpa(value) {
  return value === null ? "—" : value.toFixed(2);
}

function getGradeFromPercentage(pct) {
  const rounded = Math.round(pct);
  for (const grade of GRADING_SCALE) {
    if (rounded >= grade.minPct) return grade;
  }
  return GRADING_SCALE[GRADING_SCALE.length - 1];
}

function calcSessionalCourseResult(inputs) {
  const quiz = clamp(parseNumber(inputs.quizObtained) ?? 0, 0, 15);
  const assign = clamp(parseNumber(inputs.assignObtained) ?? 0, 0, 10);
  const mid = clamp(parseNumber(inputs.midObtained) ?? 0, 0, 25);
  const finalExam = clamp(parseNumber(inputs.finalObtained) ?? 0, 0, 50);

  const theoryPct = clamp(quiz + assign + mid + finalExam, 0, 100);

  let labPct = 0;
  let combinedPct = theoryPct;

  if (inputs.hasLab) {
    const laTotal = Math.max(0.5, parseNumber(inputs.labAssignTotal) ?? 25);
    const lmTotal = Math.max(0.5, parseNumber(inputs.labMidTotal) ?? 25);
    const lfTotal = Math.max(0.5, parseNumber(inputs.labFinalTotal) ?? 50);

    const laObt = clamp(parseNumber(inputs.labAssignObtained) ?? 0, 0, laTotal);
    const lmObt = clamp(parseNumber(inputs.labMidObtained) ?? 0, 0, lmTotal);
    const lfObt = clamp(parseNumber(inputs.labFinalObtained) ?? 0, 0, lfTotal);

    labPct = clamp(
      (laObt / laTotal) * 25 + (lmObt / lmTotal) * 25 + (lfObt / lfTotal) * 50,
      0,
      100,
    );

    const theoryCredits = Math.max(1, parseNumber(inputs.creditHours) ?? 3);
    combinedPct =
      (theoryPct * theoryCredits + labPct * 1) / (theoryCredits + 1);
  }

  const grade = getGradeFromPercentage(combinedPct);

  return {
    theoryPct: Number(theoryPct.toFixed(1)),
    labPct: Number(labPct.toFixed(1)),
    combinedPct: Number(combinedPct.toFixed(1)),
    letter: grade.letter,
    point: grade.point,
  };
}

function calculateRequiredSgpa({
  currentCgpa,
  completedCredits,
  remainingCredits,
  targetCgpa,
}) {
  const errors = {};

  if (currentCgpa === null || currentCgpa < 0 || currentCgpa > 4) {
    errors.currentCgpa = "Enter a CGPA between 0.00 and 4.00.";
  }
  if (
    completedCredits === null ||
    !Number.isSafeInteger(completedCredits) ||
    completedCredits <= 0
  ) {
    errors.completedCredits = "Enter a positive whole number of credit hours.";
  }
  if (targetCgpa === null || targetCgpa < 0 || targetCgpa > 4) {
    errors.targetCgpa = "Enter a target CGPA between 0.00 and 4.00.";
  }
  if (
    remainingCredits === null ||
    !Number.isSafeInteger(remainingCredits) ||
    remainingCredits <= 0 ||
    remainingCredits > 1000
  ) {
    errors.remainingCredits = "Enter positive whole-number remaining credits.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors, requiredSgpa: 0, maximumCgpa: 0 };
  }

  const totalCredits = completedCredits + remainingCredits;
  const requiredSgpa =
    (targetCgpa * totalCredits - currentCgpa * completedCredits) /
    remainingCredits;
  const maximumCgpa =
    (currentCgpa * completedCredits + 4.0 * remainingCredits) / totalCredits;

  if (requiredSgpa > 4.0 + 1e-9) {
    return { status: "impossible", errors: {}, requiredSgpa, maximumCgpa };
  }
  if (requiredSgpa <= 0) {
    return { status: "achieved", errors: {}, requiredSgpa: 0, maximumCgpa };
  }
  return { status: "possible", errors: {}, requiredSgpa, maximumCgpa };
}

function calculateNtsAggregate(values) {
  const errors = {};
  const contributions = { matric: 0, hssc: 0, nat: 0 };

  for (const exam of ["matric", "hssc", "nat"]) {
    const obtained = values[`${exam}Obtained`];
    const total = values[`${exam}Total`];

    if (obtained === null || obtained < 0) {
      errors[`${exam}Obtained`] = "Enter 0 or higher.";
    }
    if (total === null || total <= 0) {
      errors[`${exam}Total`] = "Enter a positive total.";
    }
    if (obtained !== null && total !== null && total > 0 && obtained > total) {
      errors[`${exam}Obtained`] = "Cannot exceed total marks.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors, aggregate: 0, contributions };
  }

  let aggregate = 0;
  for (const exam of ["matric", "hssc", "nat"]) {
    const part =
      (values[`${exam}Obtained`] / values[`${exam}Total`]) *
      NTS_NAT_WEIGHTS[exam] *
      100;
    contributions[exam] = part;
    aggregate += part;
  }

  return { status: "valid", errors: {}, aggregate, contributions };
}

function getSemesterGpaHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSemesterGpaEntry(entry) {
  const existing = getSemesterGpaHistory();
  const next = [
    ...existing,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: entry.label,
      sgpa: Number(entry.sgpa.toFixed(2)),
      credits: entry.credits,
    },
  ].slice(-12);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
  return next;
}

/**
 * Crisp inline SVG icon set (zero external font dependencies)
 */
function Icon({ name, className = "" }) {
  const paths = {
    school: (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    calculator: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="11" x2="8.01" y2="11" />
        <line x1="12" y1="11" x2="12.01" y2="11" />
        <line x1="16" y1="11" x2="16.01" y2="11" />
        <line x1="8" y1="15" x2="8.01" y2="15" />
        <line x1="12" y1="15" x2="12.01" y2="15" />
        <line x1="16" y1="15" x2="16.01" y2="15" />
      </>
    ),
    check: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    print: (
      <>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </>
    ),
    add: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    chevron: <polyline points="6 9 12 15 18 9" />,
    reset: (
      <>
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </>
    ),
    sigma: <path d="M18 6H6l6 6-6 6h12" />,
    playlistAdd: (
      <>
        <line x1="3" y1="6" x2="15" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="11" y2="18" />
        <line x1="17" y1="15" x2="17" y2="21" />
        <line x1="14" y1="18" x2="20" y2="18" />
      </>
    ),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>
    ),
  };

  return (
    <svg
      className={`gw-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || null}
    </svg>
  );
}

function createCourse(id, overrides = {}) {
  return {
    id,
    name: "",
    credits: "3",
    grade: "",
    isRetake: false,
    oldGrade: "F",
    ...overrides,
  };
}

const WORKSPACE_STYLES = `
.grade-workspace-shell {
  min-height: 100vh;
  background: var(--gw-page-bg);
  color: var(--gw-text);
  transition: background-color 180ms ease, color 180ms ease;
}

.grade-workspace-shell[data-theme="light"] {
  color-scheme: light;
  --gw-page-bg: #f8fafc;
  --gw-surface: var(--surface, #ffffff);
  --gw-subtle: var(--surface-2, #f1f5f9);
  --gw-text: var(--text, #0f172a);
  --gw-muted: var(--text-subtle, #475569);
  --gw-line: var(--border, #e2e8f0);
  --gw-brand: var(--brand, #1d4ed8);
  --gw-soft: var(--brand-soft, #eff6ff);
  --gw-error: var(--danger, #dc2626);
  --gw-error-soft: var(--danger-soft, #fef2f2);
  --gw-success: var(--success, #15803d);
  --gw-accent: var(--accent, #b45309);
  --gw-ring: var(--ring, rgba(29, 78, 216, 0.28));
  --gw-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --gw-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08);
}

.grade-workspace-shell[data-theme="dark"] {
  color-scheme: dark;
  --gw-page-bg: #020617;
  --gw-surface: var(--surface, #0f172a);
  --gw-subtle: var(--surface-2, #1e293b);
  --gw-text: var(--text, #f8fafc);
  --gw-muted: var(--text-subtle, #94a3b8);
  --gw-line: var(--border, #334155);
  --gw-brand: var(--brand, #3b82f6);
  --gw-soft: var(--brand-soft, rgba(59, 130, 246, 0.14));
  --gw-error: #f87171;
  --gw-error-soft: rgba(248, 113, 113, 0.14);
  --gw-success: #4ade80;
  --gw-accent: #fbbf24;
  --gw-ring: rgba(59, 130, 246, 0.35);
  --gw-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35);
  --gw-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.35), 0 10px 24px -12px rgba(0, 0, 0, 0.55);
}

.grade-workspace {
  --gw-radius-sm: 8px;
  --gw-radius-md: 12px;
  --gw-radius-lg: 16px;
  --gw-radius-pill: 9999px;
  --gw-dur-fast: 160ms;
  --gw-dur-base: 220ms;
  --gw-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --gw-text-heading: 1.125rem;
  --gw-text-body: 0.9375rem;
  --gw-text-sm: 0.8125rem;

  width: min(100%, 1160px);
  margin: 0 auto;
  padding: clamp(1.25rem, 3vw, 2.25rem) clamp(1rem, 3vw, 1.5rem) 4rem;
  color: var(--gw-text);
  font-family: var(--font-body, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  font-size: var(--gw-text-body);
  line-height: 1.5;
}

.grade-workspace,
.grade-workspace * {
  box-sizing: border-box;
}

.grade-workspace button,
.grade-workspace input,
.grade-workspace select {
  font: inherit;
}

.grade-workspace button,
.grade-workspace summary {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.grade-workspace button:focus-visible,
.grade-workspace summary:focus-visible,
.grade-workspace input:focus-visible,
.grade-workspace select:focus-visible {
  outline: 2px solid var(--gw-brand);
  outline-offset: 2px;
}

.gw-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

/* Header */
.grade-workspace__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.grade-workspace__title-group {
  min-width: 0;
  max-width: 42rem;
}

.grade-workspace__header h1 {
  margin: 0;
  color: var(--gw-text);
  font-size: clamp(1.75rem, 3vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.12;
}

.grade-workspace__intro {
  margin: 0.5rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-body);
  line-height: 1.55;
  max-width: 60ch;
}

.grade-workspace__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.grade-workspace__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-sm);
  background: var(--gw-surface);
  color: var(--gw-text);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: var(--gw-shadow-sm);
  transition: border-color var(--gw-dur-fast) var(--gw-ease), background-color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__action-btn:hover {
  border-color: color-mix(in srgb, var(--gw-brand) 45%, var(--gw-line));
  background: var(--gw-subtle);
}

.grade-workspace__action-btn .gw-icon {
  color: var(--gw-muted);
}

/* Segmented Tabs */
.grade-workspace__nav {
  margin-bottom: 1.5rem;
}

.grade-workspace__tablist {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  padding: 0.25rem;
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-md);
  background: var(--gw-subtle);
}

.grade-workspace__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid transparent;
  border-radius: calc(var(--gw-radius-md) - 3px);
  background: transparent;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--gw-dur-fast) var(--gw-ease),
    background-color var(--gw-dur-fast) var(--gw-ease),
    border-color var(--gw-dur-fast) var(--gw-ease),
    box-shadow var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__tab:hover:not(.is-active) {
  color: var(--gw-text);
}

.grade-workspace__tab.is-active {
  background: var(--gw-surface);
  color: var(--gw-text);
  border-color: color-mix(in srgb, var(--gw-line) 85%, transparent);
  box-shadow: var(--gw-shadow-sm);
}

.grade-workspace__tab .gw-icon {
  color: var(--gw-muted);
  transition: color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__tab.is-active .gw-icon {
  color: var(--gw-brand);
}

/* Two-Column Layout */
.grade-workspace__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21.5rem;
  align-items: start;
  gap: 1.5rem;
}

.grade-workspace__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.grade-workspace__tabpanel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Panels */
.grade-workspace__panel,
.grade-workspace__result-card,
.grade-workspace__reference {
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-lg);
  background: var(--gw-surface);
  box-shadow: var(--gw-shadow-card);
}

.grade-workspace__panel {
  padding: clamp(1.25rem, 2.5vw, 1.6rem);
}

.grade-workspace__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.grade-workspace__panel-head > div:first-child {
  min-width: 0;
  flex: 1 1 16rem;
}

.grade-workspace__panel-head h2 {
  margin: 0;
  color: var(--gw-text);
  font-size: var(--gw-text-heading);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.grade-workspace__panel-head p {
  margin: 0.3rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.5;
  max-width: 58ch;
}

.grade-workspace__meta {
  margin: 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Inputs & Controls */
.grade-workspace__label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--gw-text);
  font-size: var(--gw-text-sm);
  font-weight: 600;
}

.grade-workspace__label-hint {
  color: var(--gw-muted);
  font-weight: 400;
}

.grade-workspace input:not([type='checkbox']),
.grade-workspace select {
  display: block;
  width: 100%;
  min-width: 0;
  height: 2.625rem;
  padding: 0 0.75rem;
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-sm);
  background: var(--gw-surface);
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-variant-numeric: tabular-nums;
  transition:
    border-color var(--gw-dur-fast) var(--gw-ease),
    box-shadow var(--gw-dur-fast) var(--gw-ease),
    background-color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace input:not([type='checkbox']):hover,
.grade-workspace select:hover {
  border-color: color-mix(in srgb, var(--gw-text) 28%, var(--gw-line));
}

.grade-workspace input:not([type='checkbox']):focus,
.grade-workspace select:focus {
  border-color: var(--gw-brand);
  box-shadow: 0 0 0 3px var(--gw-ring);
  outline: none;
}

.grade-workspace input::placeholder {
  color: var(--gw-muted);
  opacity: 0.72;
}

.grade-workspace input[aria-invalid='true'] {
  border-color: var(--gw-error);
}

.grade-workspace input[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gw-error) 22%, transparent);
}

.grade-workspace select {
  cursor: pointer;
}

.grade-workspace input[type='checkbox'] {
  accent-color: var(--gw-brand);
  width: 1rem;
  height: 1rem;
  margin: 0;
  cursor: pointer;
}

.grade-workspace__field-error {
  margin: 0.35rem 0 0;
  color: var(--gw-error);
  font-size: var(--gw-text-sm);
  line-height: 1.45;
}

/* Course Ledger */
.grade-workspace__table-head,
.grade-workspace__course-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.25rem 8.5rem 2.5rem;
  align-items: center;
  gap: 0.75rem;
}

.grade-workspace__table-head {
  padding: 0 0 0.6rem;
  border-bottom: 1px solid var(--gw-line);
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
}

.grade-workspace__table-head > span:first-child {
  padding-left: 2.15rem;
}

.grade-workspace__course-list {
  display: flex;
  flex-direction: column;
}

.grade-workspace__course-row {
  padding: 0.9rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--gw-line) 75%, transparent);
}

.grade-workspace__course-row:last-child {
  border-bottom: 0;
}

.grade-workspace__name-field,
.grade-workspace__name-wrap {
  min-width: 0;
}

.grade-workspace__name-wrap {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.grade-workspace__row-index {
  width: 1.5rem;
  flex-shrink: 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.grade-workspace__mobile-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.grade-workspace__icon-btn {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--gw-radius-sm);
  background: transparent;
  color: var(--gw-muted);
  cursor: pointer;
  transition: color var(--gw-dur-fast) var(--gw-ease), background-color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__icon-btn:hover {
  background: var(--gw-error-soft);
  color: var(--gw-error);
}

.grade-workspace__retake {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.65rem;
  padding-left: 2.15rem;
}

.grade-workspace__checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  cursor: pointer;
  user-select: none;
}

.grade-workspace__checkbox-label:hover {
  color: var(--gw-text);
}

.grade-workspace__previous-grade {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
}

.grade-workspace__previous-grade select {
  width: auto;
  min-width: 6.75rem;
  height: 2.125rem;
  padding: 0 0.6rem;
  font-size: var(--gw-text-sm);
  background: var(--gw-subtle);
}

/* Footer & Buttons */
.grade-workspace__panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--gw-line);
}

.grade-workspace__progress-note {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-variant-numeric: tabular-nums;
}

.grade-workspace__btn-primary,
.grade-workspace__btn-secondary,
.grade-workspace__btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.625rem;
  padding: 0 1rem;
  border-radius: var(--gw-radius-sm);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--gw-dur-fast) var(--gw-ease),
    border-color var(--gw-dur-fast) var(--gw-ease),
    color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__btn-primary {
  border: 1px solid var(--gw-brand);
  background: var(--gw-brand);
  color: #ffffff;
}

.grade-workspace__btn-primary:hover {
  background: color-mix(in srgb, var(--gw-brand) 88%, #000000);
  border-color: color-mix(in srgb, var(--gw-brand) 88%, #000000);
}

.grade-workspace__btn-secondary {
  border: 1px solid var(--gw-line);
  background: var(--gw-surface);
  color: var(--gw-text);
}

.grade-workspace__btn-secondary:hover {
  border-color: color-mix(in srgb, var(--gw-brand) 50%, var(--gw-line));
  background: var(--gw-soft);
  color: var(--gw-brand);
}

.grade-workspace__btn-ghost {
  width: 100%;
  border: 1px solid var(--gw-line);
  background: transparent;
  color: var(--gw-muted);
}

.grade-workspace__btn-ghost:hover {
  background: var(--gw-subtle);
  color: var(--gw-text);
}

.grade-workspace__btn-full {
  width: 100%;
}

/* Empty State */
.grade-workspace__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1.25rem;
  border: 1px dashed var(--gw-line);
  border-radius: var(--gw-radius-md);
  background: var(--gw-subtle);
  color: var(--gw-muted);
  text-align: center;
}

.grade-workspace__empty .gw-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--gw-brand);
}

.grade-workspace__empty p {
  margin: 0;
  font-size: var(--gw-text-body);
}

/* Switch */
.grade-workspace__switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.grade-workspace__switch input[type='checkbox'] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.grade-workspace__switch-track {
  position: relative;
  display: block;
  width: 2.85rem;
  height: 1.6rem;
  border-radius: var(--gw-radius-pill);
  background: color-mix(in srgb, var(--gw-muted) 32%, var(--gw-line));
  transition: background-color var(--gw-dur-base) var(--gw-ease);
}

.grade-workspace__switch-track::after {
  content: '';
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
  transition: transform var(--gw-dur-base) var(--gw-ease);
}

.grade-workspace__switch input:checked + .grade-workspace__switch-track {
  background: var(--gw-brand);
}

.grade-workspace__switch input:checked + .grade-workspace__switch-track::after {
  transform: translateX(1.25rem);
}

.grade-workspace__switch input:focus-visible + .grade-workspace__switch-track {
  outline: 2px solid var(--gw-brand);
  outline-offset: 2px;
}

/* Grids & Notes */
.grade-workspace__subject-analyzer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.65fr);
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.25rem;
  padding: 1rem;
  border: 1px solid var(--gw-line);
  border-radius: 0.75rem;
  background: var(--gw-subtle);
}

.grade-workspace__subject-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8rem;
  gap: 0.75rem;
}

.grade-workspace__image-analyzer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex-wrap: wrap;
}

.grade-workspace__image-analyzer small {
  color: var(--gw-muted);
  min-width: 0;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grade-workspace__file-input {
  display: none;
}

.grade-workspace__file-name {
  font-weight: 700;
}

.is-spinning {
  animation: gw-spin 1s linear infinite;
}

@keyframes gw-spin {
  to { transform: rotate(360deg); }
}

.grade-workspace__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
}

.grade-workspace__pair-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.grade-workspace__footnote,
.grade-workspace__muted-note {
  margin: 1rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.55;
}

.grade-workspace__muted-note {
  margin-top: 0;
}

/* Lab Subpanel */
.grade-workspace__subpanel {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--gw-line);
}

.grade-workspace__subpanel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.grade-workspace__subpanel-head h3 {
  margin: 0;
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-weight: 700;
}

.grade-workspace__subpanel-head p {
  margin: 0.25rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
}

.grade-workspace__lab-list {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
}

.grade-workspace__lab-row {
  display: grid;
  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
  align-items: end;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid color-mix(in srgb, var(--gw-line) 75%, transparent);
}

.grade-workspace__lab-title {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 0.45rem;
}

.grade-workspace__lab-title strong {
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-weight: 600;
}

.grade-workspace__lab-title span {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
}

/* NAT Inputs */
.grade-workspace__nat-list {
  display: flex;
  flex-direction: column;
}

.grade-workspace__nat-group {
  min-width: 0;
  margin: 0;
  padding: 1rem 0;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--gw-line) 75%, transparent);
}

.grade-workspace__nat-group:first-child {
  padding-top: 0.25rem;
  border-top: 0;
}

.grade-workspace__nat-group legend {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.65rem;
  padding: 0;
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-weight: 700;
}

.grade-workspace__weight {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__info-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: var(--gw-radius-md);
  background: var(--gw-subtle);
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.55;
}

.grade-workspace__info-banner .gw-icon {
  margin-top: 0.1rem;
  color: var(--gw-brand);
}

.grade-workspace__info-banner p {
  margin: 0;
}

/* Semester Trend Chart */
.grade-workspace__save-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.grade-workspace__save-bar input {
  width: 9rem;
}

.grade-workspace__chart-wrap {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: stretch;
  padding-top: 0.5rem;
}

.grade-workspace__chart-guides {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem 0 1.85rem;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.grade-workspace__chart-area {
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.grade-workspace__chart-bars {
  display: grid;
  gap: 0.75rem;
  min-width: 100%;
}

.grade-workspace__bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.grade-workspace__bar-value {
  color: var(--gw-brand);
  font-size: var(--gw-text-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__bar-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 8.5rem;
  border-bottom: 1px solid var(--gw-line);
  background: repeating-linear-gradient(
    to bottom,
    color-mix(in srgb, var(--gw-line) 55%, transparent) 0 1px,
    transparent 1px 25%
  );
}

.grade-workspace__bar-fill {
  width: 100%;
  max-width: 2.75rem;
  border-radius: 6px 6px 0 0;
  background: var(--gw-brand);
  transition: height var(--gw-dur-base) var(--gw-ease);
}

.grade-workspace__bar-label {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  text-align: center;
  max-width: 5.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Reference Disclosure */
.grade-workspace__reference {
  overflow: hidden;
}

.grade-workspace__reference summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  list-style: none;
  transition: background-color var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__reference summary:hover {
  background: var(--gw-subtle);
}

.grade-workspace__reference summary::-webkit-details-marker {
  display: none;
}

.grade-workspace__reference-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.grade-workspace__reference-title .gw-icon {
  color: var(--gw-brand);
}

.grade-workspace__chevron {
  color: var(--gw-muted);
  transition: transform var(--gw-dur-fast) var(--gw-ease);
}

.grade-workspace__reference[open] .grade-workspace__chevron {
  transform: rotate(180deg);
}

.grade-workspace__reference-body {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--gw-line);
}

.grade-workspace__grade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: 0.5rem;
  padding-top: 1rem;
}

.grade-workspace__grade-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.4rem;
  border-radius: var(--gw-radius-sm);
  background: var(--gw-subtle);
}

.grade-workspace__grade-cell strong {
  color: var(--gw-brand);
  font-size: var(--gw-text-body);
  font-weight: 700;
}

.grade-workspace__grade-cell span {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-variant-numeric: tabular-nums;
}

.grade-workspace__reference-note {
  margin: 0.9rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.5;
}

/* Sticky Result Rail */
.grade-workspace__aside {
  position: sticky;
  top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grade-workspace__result-card {
  padding: 1.5rem;
  border-top: 3px solid var(--gw-brand);
}

.grade-workspace__result-card[data-status='achieved'] {
  border-top-color: var(--gw-success);
}

.grade-workspace__result-card[data-status='impossible'] {
  border-top-color: var(--gw-accent);
}

.grade-workspace__result-card h2 {
  margin: 0;
  color: var(--gw-text);
  font-size: var(--gw-text-heading);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.grade-workspace__score {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin: 1rem 0 0.85rem;
}

.grade-workspace__score strong {
  color: var(--gw-brand);
  font-size: clamp(2.75rem, 5vw, 3.5rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
  line-height: 1;
}

.grade-workspace__result-card[data-status='achieved'] .grade-workspace__score strong {
  color: var(--gw-success);
}

.grade-workspace__result-card[data-status='impossible'] .grade-workspace__score strong {
  color: var(--gw-accent);
}

.grade-workspace__score span {
  color: var(--gw-muted);
  font-size: var(--gw-text-body);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__meter {
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--gw-radius-pill);
  background: var(--gw-subtle);
}

.grade-workspace__meter > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gw-brand);
  transition: width 300ms var(--gw-ease);
}

.grade-workspace__result-card[data-status='achieved'] .grade-workspace__meter > span {
  background: var(--gw-success);
}

.grade-workspace__result-card[data-status='impossible'] .grade-workspace__meter > span {
  background: var(--gw-accent);
}

.grade-workspace__meter--thin {
  height: 0.4rem;
}

.grade-workspace__meter-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 0.35rem;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-variant-numeric: tabular-nums;
}

.grade-workspace__status {
  margin: 1rem 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.55;
}

.grade-workspace__breakdown {
  margin: 0 0 1.25rem;
  padding: 0;
  border-top: 1px solid var(--gw-line);
}

.grade-workspace__breakdown > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--gw-line) 75%, transparent);
}

.grade-workspace__breakdown dt {
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
}

.grade-workspace__breakdown dd {
  margin: 0;
  color: var(--gw-text);
  font-size: var(--gw-text-body);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__highlight-box {
  margin-bottom: 1.1rem;
  padding: 0.9rem 1rem;
  border-radius: var(--gw-radius-md);
  background: var(--gw-soft);
}

.grade-workspace__highlight-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.grade-workspace__highlight-row span {
  color: var(--gw-text);
  font-size: var(--gw-text-sm);
  font-weight: 600;
}

.grade-workspace__highlight-row strong {
  color: var(--gw-brand);
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__highlight-box p {
  margin: 0.35rem 0 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.45;
}

.grade-workspace__nat-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 1rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--gw-line);
}

.grade-workspace__nat-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.grade-workspace__nat-row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.grade-workspace__nat-row-head dt {
  color: var(--gw-text);
  font-size: var(--gw-text-sm);
  font-weight: 600;
}

.grade-workspace__nat-row-head dd {
  margin: 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.grade-workspace__formula {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1rem;
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-md);
  background: var(--gw-subtle);
}

.grade-workspace__formula .gw-icon {
  color: var(--gw-brand);
  margin-top: 0.1rem;
}

.grade-workspace__formula strong {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--gw-text);
  font-size: var(--gw-text-sm);
  font-weight: 700;
}

.grade-workspace__formula p,
.grade-workspace__disclaimer {
  margin: 0;
  color: var(--gw-muted);
  font-size: var(--gw-text-sm);
  line-height: 1.5;
}

.grade-workspace__disclaimer {
  padding: 0 0.25rem;
}

/* Toast Notification */
.grade-workspace__toast {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: min(24rem, calc(100vw - 2.5rem));
  padding: 0.75rem 1rem;
  border: 1px solid var(--gw-line);
  border-radius: var(--gw-radius-md);
  background: var(--gw-text);
  color: var(--gw-surface);
  font-size: var(--gw-text-sm);
  font-weight: 600;
  box-shadow: 0 12px 30px -10px rgba(15, 23, 42, 0.35);
}

/* Responsive */
@media (max-width: 960px) {
  .grade-workspace__layout {
    grid-template-columns: 1fr;
  }

  .grade-workspace__aside {
    position: static;
  }
}

@media (max-width: 640px) {
  .grade-workspace {
    padding-bottom: 5rem;
  }

  .grade-workspace__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
  }

  .grade-workspace__header-actions {
    width: 100%;
  }

  .grade-workspace__action-btn {
    flex: 1 1 auto;
  }

  .grade-workspace__tablist {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .grade-workspace__tab {
    padding: 0 0.65rem;
  }

  .grade-workspace__table-head {
    display: none;
  }

  .grade-workspace__course-fields {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) 2.5rem;
    align-items: end;
  }

  .grade-workspace__name-field {
    grid-column: 1 / -1;
  }

  .grade-workspace__row-index {
    display: none;
  }

  .grade-workspace__mobile-label {
    position: static;
    display: block;
    width: auto;
    height: auto;
    margin: 0 0 0.35rem;
    overflow: visible;
    clip-path: none;
    white-space: normal;
    color: var(--gw-text);
    font-size: var(--gw-text-sm);
    font-weight: 600;
  }

  .grade-workspace__retake {
    padding-left: 0;
  }

  .grade-workspace__subject-analyzer,
  .grade-workspace__subject-fields,
  .grade-workspace__form-grid,
  .grade-workspace__lab-row {
    grid-template-columns: 1fr;
  }

  .grade-workspace__lab-title {
    padding-bottom: 0;
  }

  .grade-workspace input:not([type='checkbox']),
  .grade-workspace select {
    font-size: 1rem;
  }

  .grade-workspace__save-bar {
    width: 100%;
  }

  .grade-workspace__save-bar input {
    flex: 1 1 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grade-workspace *,
  .grade-workspace *::before,
  .grade-workspace *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

@media print {
  .grade-workspace-shell {
    background: #ffffff !important;
  }

  .grade-workspace {
    width: 100%;
    padding: 0;
  }

  .grade-workspace__header-actions,
  .grade-workspace__nav,
  .grade-workspace__btn-primary,
  .grade-workspace__btn-secondary,
  .grade-workspace__btn-ghost,
  .grade-workspace__icon-btn,
  .grade-workspace__save-bar,
  .grade-workspace__toast {
    display: none !important;
  }

  .grade-workspace__layout {
    grid-template-columns: 1fr;
  }

  .grade-workspace__panel,
  .grade-workspace__result-card,
  .grade-workspace__reference {
    box-shadow: none;
    break-inside: avoid;
  }
}
`;

export function GpaCalculator() {
  const componentId = useId();
  const nextId = useRef(4);
  const tabRefs = useRef([]);
  const toastTimer = useRef(null);

  const [theme, setTheme] = useState("light");
  const [activeTab, setActiveTab] = useState("semester");
  const [toastMessage, setToastMessage] = useState("");

  const [courses, setCourses] = useState(() => [
    createCourse(1, { name: "Data Structures", credits: "4", grade: "A-" }),
    createCourse(2, { name: "Discrete Structures", credits: "3", grade: "A" }),
    createCourse(3, { name: "Database Systems", credits: "4", grade: "B+" }),
  ]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [prevCgpa, setPrevCgpa] = useState("3.38");
  const [prevCredits, setPrevCredits] = useState("60");

  const [targetCgpa, setTargetCgpa] = useState("3.50");
  const [upcomingCredits, setUpcomingCredits] = useState("15");
  const [remainingSemesters, setRemainingSemesters] = useState("2");
  const [creditPlanMode, setCreditPlanMode] = useState("semesters");

  const [natInputs, setNatInputs] = useState({
    matricObtained: "",
    matricTotal: "1100",
    hsscObtained: "",
    hsscTotal: "1100",
    natObtained: "",
    natTotal: "100",
  });

  const [semesterHistory, setSemesterHistory] = useState(() =>
    getSemesterGpaHistory(),
  );
  const [semesterLabel, setSemesterLabel] = useState("Current Sem");

  const [sessionalInputs, setSessionalInputs] = useState({
    quizObtained: "12",
    quizTotal: "15",
    assignObtained: "8.5",
    assignTotal: "10",
    midObtained: "20",
    midTotal: "25",
    finalObtained: "40",
    finalTotal: "50",
    hasLab: false,
    labAssignObtained: "20",
    labAssignTotal: "25",
    labMidObtained: "20",
    labMidTotal: "25",
    labFinalObtained: "40",
    labFinalTotal: "50",
    creditHours: "3",
  });
  const [sessionalSubjectName, setSessionalSubjectName] = useState("");
  const [scanImageName, setScanImageName] = useState("");
  const [isScanningSubject, setIsScanningSubject] = useState(false);
  const sessionalImageInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(message) {
    setToastMessage(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToastMessage("");
    }, 3200);
  }

  const sessionalResult = calcSessionalCourseResult(sessionalInputs);

  const natResult = calculateNtsAggregate(
    Object.fromEntries(
      Object.entries(natInputs).map(([field, value]) => [
        field,
        parseNumber(value),
      ]),
    ),
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

    if (!validCredits) {
      hasInvalidCredits = true;
    }

    if (complete) {
      completedCount += 1;
      totalCredits += parsedCredits;
      totalQualityPoints += parsedCredits * gradeInfo.point;
      if (course.isRetake) {
        retakeCredits += parsedCredits;
        retakeOldQualityPoints += parsedCredits * (oldGradeInfo?.point ?? 0);
      }
    }

    return {
      ...course,
      parsedCredits,
      gradeInfo,
      oldGradeInfo,
      validCredits,
      complete,
    };
  });

  const ready = courses.length > 0 && completedCount === courses.length;
  const sgpa = ready ? totalQualityPoints / totalCredits : null;

  const previousGpa = parseNumber(prevCgpa);
  const previousCreditCount = parseNumber(prevCredits);

  const validPreviousGpa =
    previousGpa !== null && previousGpa >= 0 && previousGpa <= 4;

  const validPreviousCredits =
    previousCreditCount !== null &&
    Number.isInteger(previousCreditCount) &&
    previousCreditCount > 0;

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
            (previousGpa * previousCreditCount -
              retakeOldQualityPoints +
              totalQualityPoints) /
              netCombinedCredits,
          ),
        )
      : null;

  const parsedTarget = parseNumber(targetCgpa);
  const parsedUpcomingCr = parseNumber(upcomingCredits);
  const parsedSemesters = parseNumber(remainingSemesters);
  const validSemesters =
    Number.isSafeInteger(parsedSemesters) && parsedSemesters > 0;
  const validUpcomingCredits =
    Number.isSafeInteger(parsedUpcomingCr) && parsedUpcomingCr > 0;
  const remainingCreditCount =
    creditPlanMode === "semesters"
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
      key: "currentCgpa",
      id: "previous-gpa",
      label: "Current CGPA",
      value: prevCgpa,
      update: setPrevCgpa,
      min: 0,
      max: 4,
      step: "0.01",
      placeholder: "e.g. 3.25",
    },
    {
      key: "completedCredits",
      id: "previous-credits",
      label: "Completed credit hours",
      value: prevCredits,
      update: setPrevCredits,
      min: 1,
      step: "1",
      placeholder: "e.g. 60",
    },
    {
      key: "targetCgpa",
      id: "target-cgpa",
      label: "Target CGPA",
      value: targetCgpa,
      update: setTargetCgpa,
      min: 0,
      max: 4,
      step: "0.01",
      placeholder: "e.g. 3.50",
    },
  ];

  const sgpaProgress =
    sgpa === null ? 0 : Math.min(100, Math.max(0, (sgpa / 4) * 100));

  let statusText =
    "Select a grade for each course to calculate your semester GPA.";
  if (courses.length === 0) {
    statusText = "Add your first course to get started.";
  } else if (hasInvalidCredits) {
    statusText = "Enter positive whole-number credits for every course.";
  } else if (ready) {
    statusText = `Based on ${courses.length} ${courses.length === 1 ? "course" : "courses"} and ${totalCredits} credit hours.`;
  }

  function updateCourse(id, field, value) {
    setCourses((current) =>
      current.map((course) =>
        course.id === id ? { ...course, [field]: value } : course,
      ),
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
    setPrevCgpa("");
    setPrevCredits("");
    setIncludeHistory(false);
    showToast("Calculator reset.");
  }

  function handleSaveSemesterToHistory() {
    if (sgpa === null) return;
    const next = saveSemesterGpaEntry({
      label: semesterLabel.trim() || `Sem ${semesterHistory.length + 1}`,
      sgpa,
      credits: totalCredits,
    });
    setSemesterHistory(next);
    showToast("Semester SGPA saved to your history chart.");
  }

  function sumMarkEntries(entries) {
    if (!Array.isArray(entries)) return { obtained: 0, total: 0 };
    return entries.reduce(
      (sum, entry) => ({
        obtained: sum.obtained + (Number(entry?.obtained) || 0),
        total: sum.total + (Number(entry?.total) || 0),
      }),
      { obtained: 0, total: 0 },
    );
  }

  function scaleMarks(mark, weight) {
    if (!mark || mark.total <= 0) return "";
    return String(Number(((mark.obtained / mark.total) * weight).toFixed(2)));
  }

  async function handleSessionalImageScan(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      showToast("Upload a PNG, JPEG, or WebP screenshot.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("The screenshot must be smaller than 3 MB.");
      return;
    }

    setScanImageName(file.name);
    setIsScanningSubject(true);

    try {
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the image."));
        reader.readAsDataURL(file);
      });

      const token = await authHelper.getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers,
        body: JSON.stringify({ imageBase64 }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Could not analyze this screenshot.");
      }

      const theory = payload.theory || {};
      const quizzes = sumMarkEntries(theory.quizzes);
      const assignments = sumMarkEntries(theory.assignments);

      setSessionalSubjectName(payload.subjectName || "");
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
      showToast(
        payload.subjectName
          ? `${payload.subjectName} marks added.`
          : "Screenshot marks added.",
      );
    } catch (error) {
      showToast(error.message || "Could not analyze this screenshot.");
    } finally {
      setIsScanningSubject(false);
    }
  }

  function handleApplySessionalToCourses() {
    const credits = sessionalInputs.hasLab ? "4" : "3";
    const subjectName = sessionalSubjectName.trim();
    const hasSingleEmptyRow =
      courses.length === 1 &&
      courses[0].name.trim() === "" &&
      courses[0].grade === "";

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
      addCourse({
        name: subjectName,
        credits,
        grade: sessionalResult.letter,
      });
    }
    setActiveTab("semester");
    showToast(
      `Added Grade ${sessionalResult.letter} (${credits} cr) to semester courses.`,
    );
  }

  function handleExportPrint() {
    window.print();
  }

  function handleTabKeyDown(event, index) {
    let nextIndex = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % WORKSPACE_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = WORKSPACE_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveTab(WORKSPACE_TABS[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  const requiredDisplay =
    targetResult.status === "invalid"
      ? "—"
      : targetResult.status === "impossible"
        ? targetResult.requiredSgpa.toFixed(2)
        : (Math.ceil(targetResult.requiredSgpa * 100 - 1e-9) / 100).toFixed(2);

  const requiredProgress =
    targetResult.status === "invalid"
      ? 0
      : Math.min(100, Math.max(0, (targetResult.requiredSgpa / 4) * 100));

  const sessionalPct = Math.min(
    100,
    Math.max(0, Number(sessionalResult.combinedPct) || 0),
  );

  return (
    <div className="grade-workspace-shell" data-theme={theme}>
      <style>{WORKSPACE_STYLES}</style>

      <div className="grade-workspace">
        <header className="grade-workspace__header">
          <div className="grade-workspace__title-group">
            <h1>GPA &amp; academic calculator</h1>
            <p className="grade-workspace__intro">
              Calculate semester GPA with retakes, plan target CGPA, estimate
              subject marks, and check COMSATS NTS NAT aggregate.
            </p>
          </div>

          <div className="grade-workspace__header-actions">
            <button
              type="button"
              className="grade-workspace__action-btn"
              onClick={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>

            <button
              type="button"
              className="grade-workspace__action-btn"
              onClick={handleExportPrint}
            >
              <Icon name="print" />
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
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`${componentId}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`${componentId}-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  className={`grade-workspace__tab${isSelected ? " is-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <Icon name={tab.icon} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="grade-workspace__layout">
          <div className="grade-workspace__main">
            {activeTab === "semester" ? (
              <div
                id={`${componentId}-panel-semester`}
                role="tabpanel"
                aria-labelledby={`${componentId}-tab-semester`}
                className="grade-workspace__tabpanel"
              >
                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-courses-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-courses-title`}>
                        Semester courses
                      </h2>
                      <p>
                        Enter credit hours and final grades. Mark any repeated
                        course to adjust your CGPA.
                      </p>
                    </div>
                    <p className="grade-workspace__meta">
                      {courses.length}{" "}
                      {courses.length === 1 ? "course" : "courses"}
                      {totalCredits > 0 ? ` · ${totalCredits} cr` : ""}
                    </p>
                  </div>

                  {courses.length > 0 ? (
                    <>
                      <div
                        className="grade-workspace__table-head"
                        aria-hidden="true"
                      >
                        <span>Course</span>
                        <span>Credits</span>
                        <span>Grade</span>
                        <span />
                      </div>

                      <div className="grade-workspace__course-list">
                        {evaluatedCourses.map((course, index) => {
                          const rowId = `${componentId}-course-${course.id}`;
                          return (
                            <div
                              className="grade-workspace__course-row"
                              key={course.id}
                            >
                              <div className="grade-workspace__course-fields">
                                <div className="grade-workspace__name-field">
                                  <label
                                    className="grade-workspace__mobile-label"
                                    htmlFor={`${rowId}-name`}
                                  >
                                    Course name
                                  </label>
                                  <div className="grade-workspace__name-wrap">
                                    <span className="grade-workspace__row-index">
                                      {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <input
                                      id={`${rowId}-name`}
                                      type="text"
                                      value={course.name}
                                      onChange={(event) =>
                                        updateCourse(
                                          course.id,
                                          "name",
                                          event.target.value,
                                        )
                                      }
                                      placeholder={`Course ${index + 1} (optional)`}
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
                                        "credits",
                                        event.target.value,
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
                                        "grade",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="">Select</option>
                                    {GRADING_SCALE.map((grade) => (
                                      <option
                                        key={grade.letter}
                                        value={grade.letter}
                                      >
                                        {grade.letter} ·{" "}
                                        {grade.point.toFixed(2)}
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
                                  <Icon name="close" />
                                </button>
                              </div>

                              <div className="grade-workspace__retake">
                                <label className="grade-workspace__checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(course.isRetake)}
                                    onChange={(event) =>
                                      updateCourse(
                                        course.id,
                                        "isRetake",
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  <span>Repeating a previous grade</span>
                                </label>

                                {course.isRetake ? (
                                  <label className="grade-workspace__previous-grade">
                                    <span>Replaced grade</span>
                                    <select
                                      value={course.oldGrade}
                                      onChange={(event) =>
                                        updateCourse(
                                          course.id,
                                          "oldGrade",
                                          event.target.value,
                                        )
                                      }
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
                                <p
                                  className="grade-workspace__field-error"
                                  id={`${rowId}-error`}
                                >
                                  Credits must be a whole number between{" "}
                                  {COURSE_CREDIT_MIN} and {COURSE_CREDIT_MAX}.
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="grade-workspace__empty">
                      <Icon name="book" />
                      <p>
                        No courses added yet. Add a course below to calculate
                        your GPA.
                      </p>
                    </div>
                  )}

                  <div className="grade-workspace__panel-footer">
                    <button
                      type="button"
                      className="grade-workspace__btn-primary"
                      onClick={() => addCourse()}
                    >
                      <Icon name="add" />
                      <span>Add course</span>
                    </button>

                    <span className="grade-workspace__progress-note">
                      {completedCount} of {courses.length} ready
                    </span>
                  </div>
                </section>

                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-record-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-record-title`}>
                        Include previous record
                      </h2>
                      <p>
                        Combine past semesters with this term to estimate your
                        cumulative GPA.
                      </p>
                    </div>

                    <label className="grade-workspace__switch">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={includeHistory}
                        onChange={(event) =>
                          setIncludeHistory(event.target.checked)
                        }
                        aria-label="Include previous semesters in CGPA calculation"
                      />
                      <span className="grade-workspace__switch-track" />
                    </label>
                  </div>

                  {includeHistory ? (
                    <div className="grade-workspace__form-grid">
                      <div>
                        <label
                          className="grade-workspace__label"
                          htmlFor={`${componentId}-hist-gpa`}
                        >
                          Current CGPA
                        </label>
                        <input
                          id={`${componentId}-hist-gpa`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="4"
                          step="0.01"
                          placeholder="e.g. 3.25"
                          value={prevCgpa}
                          onChange={(event) => setPrevCgpa(event.target.value)}
                          aria-invalid={prevCgpa !== "" && !validPreviousGpa}
                        />
                        {prevCgpa !== "" && !validPreviousGpa ? (
                          <p className="grade-workspace__field-error">
                            Enter a CGPA between 0.00 and 4.00.
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          className="grade-workspace__label"
                          htmlFor={`${componentId}-hist-cr`}
                        >
                          Completed credit hours
                        </label>
                        <input
                          id={`${componentId}-hist-cr`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          placeholder="e.g. 60"
                          value={prevCredits}
                          onChange={(event) =>
                            setPrevCredits(event.target.value)
                          }
                          aria-invalid={
                            prevCredits !== "" && !validPreviousCredits
                          }
                        />
                        {prevCredits !== "" && !validPreviousCredits ? (
                          <p className="grade-workspace__field-error">
                            Enter a positive whole number of credit hours.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-trend-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-trend-title`}>
                        Semester GPA history
                      </h2>
                      <p>
                        Save completed semesters to track your GPA trend over
                        time.
                      </p>
                    </div>

                    {sgpa !== null ? (
                      <div className="grade-workspace__save-bar">
                        <input
                          type="text"
                          value={semesterLabel}
                          onChange={(event) =>
                            setSemesterLabel(event.target.value)
                          }
                          aria-label="Semester label"
                          placeholder="e.g. Fall 2026"
                          maxLength={32}
                        />
                        <button
                          type="button"
                          className="grade-workspace__btn-secondary"
                          onClick={handleSaveSemesterToHistory}
                        >
                          <Icon name="save" />
                          <span>Save {sgpa.toFixed(2)}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {semesterHistory.length === 0 ? (
                    <p className="grade-workspace__muted-note">
                      No saved semesters yet. Complete your courses above and
                      save your SGPA to start your trend.
                    </p>
                  ) : (
                    <div className="grade-workspace__chart-wrap">
                      <div
                        className="grade-workspace__chart-guides"
                        aria-hidden="true"
                      >
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
                            const heightPct = Math.max(
                              8,
                              Math.min(100, (numericSgpa / 4) * 100),
                            );
                            return (
                              <div
                                key={item.id}
                                className="grade-workspace__bar-col"
                                title={`${item.label}: ${numericSgpa.toFixed(2)} SGPA (${item.credits} cr)`}
                              >
                                <span className="grade-workspace__bar-value">
                                  {numericSgpa.toFixed(2)}
                                </span>
                                <div className="grade-workspace__bar-track">
                                  <div
                                    className="grade-workspace__bar-fill"
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                                <span className="grade-workspace__bar-label">
                                  {item.label}
                                </span>
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

            {activeTab === "planner" ? (
              <div
                id={`${componentId}-panel-planner`}
                role="tabpanel"
                aria-labelledby={`${componentId}-tab-planner`}
                className="grade-workspace__tabpanel"
              >
                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-planner-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-planner-title`}>
                        Target CGPA planner
                      </h2>
                      <p>
                        Calculate the credit-weighted SGPA average needed across
                        your remaining credits to reach your goal.
                      </p>
                    </div>
                  </div>

                  <div className="grade-workspace__form-grid">
                    {plannerFields.map((field) => {
                      const error =
                        field.value !== ""
                          ? targetResult.errors[field.key]
                          : undefined;
                      const fieldId = `${componentId}-${field.id}`;
                      return (
                        <div key={field.key}>
                          <label
                            className="grade-workspace__label"
                            htmlFor={fieldId}
                          >
                            {field.label}
                          </label>
                          <input
                            id={fieldId}
                            type="number"
                            inputMode={
                              field.step === "1" ? "numeric" : "decimal"
                            }
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            placeholder={field.placeholder}
                            value={field.value}
                            onChange={(event) =>
                              field.update(event.target.value)
                            }
                            aria-invalid={Boolean(error)}
                            aria-describedby={
                              error ? `${fieldId}-error` : undefined
                            }
                          />
                          {error ? (
                            <p
                              className="grade-workspace__field-error"
                              id={`${fieldId}-error`}
                            >
                              {error}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}

                    <div>
                      <label
                        className="grade-workspace__label"
                        htmlFor={`${componentId}-credit-plan`}
                      >
                        Plan remaining credits by
                      </label>
                      <select
                        id={`${componentId}-credit-plan`}
                        value={creditPlanMode}
                        onChange={(event) =>
                          setCreditPlanMode(event.target.value)
                        }
                      >
                        <option value="semesters">
                          Semesters × credits per semester
                        </option>
                        <option value="credits">
                          Total remaining credit hours
                        </option>
                      </select>
                    </div>

                    {creditPlanMode === "semesters" ? (
                      <div>
                        <label
                          className="grade-workspace__label"
                          htmlFor={`${componentId}-remaining-semesters`}
                        >
                          Remaining semesters
                        </label>
                        <input
                          id={`${componentId}-remaining-semesters`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          value={remainingSemesters}
                          onChange={(event) =>
                            setRemainingSemesters(event.target.value)
                          }
                          aria-invalid={
                            remainingSemesters !== "" && !validSemesters
                          }
                          aria-describedby={
                            remainingSemesters !== "" && !validSemesters
                              ? `${componentId}-semesters-error`
                              : undefined
                          }
                        />
                        {remainingSemesters !== "" && !validSemesters ? (
                          <p
                            className="grade-workspace__field-error"
                            id={`${componentId}-semesters-error`}
                          >
                            Enter a positive whole number of semesters.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <label
                        className="grade-workspace__label"
                        htmlFor={`${componentId}-upcoming-cr`}
                      >
                        {creditPlanMode === "semesters"
                          ? "Credits per remaining semester"
                          : "Total remaining credit hours"}
                      </label>
                      <input
                        id={`${componentId}-upcoming-cr`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={upcomingCredits}
                        onChange={(event) =>
                          setUpcomingCredits(event.target.value)
                        }
                        aria-invalid={
                          upcomingCredits !== "" &&
                          (!validUpcomingCredits ||
                            (validSemesters &&
                              Boolean(targetResult.errors.remainingCredits)))
                        }
                        aria-describedby={
                          upcomingCredits !== "" &&
                          (!validUpcomingCredits ||
                            (validSemesters &&
                              Boolean(targetResult.errors.remainingCredits)))
                            ? `${componentId}-remaining-credits-error`
                            : undefined
                        }
                      />
                      {upcomingCredits !== "" &&
                      (!validUpcomingCredits ||
                        (validSemesters &&
                          targetResult.errors.remainingCredits)) ? (
                        <p
                          className="grade-workspace__field-error"
                          id={`${componentId}-remaining-credits-error`}
                        >
                          Enter positive whole-number credit hours within the
                          supported range.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <p className="grade-workspace__footnote">
                    Required SGPA is rounded up to two decimals and assumes all
                    remaining credits are new, counted courses. Retakes or
                    excluded credits require separate planning.
                  </p>
                </section>
              </div>
            ) : null}

            {activeTab === "sessional" ? (
              <div
                id={`${componentId}-panel-sessional`}
                role="tabpanel"
                aria-labelledby={`${componentId}-tab-sessional`}
                className="grade-workspace__tabpanel"
              >
                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-sessional-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-sessional-title`}>
                        Subject marks estimator
                      </h2>
                      <p>
                        Theory weights: quizzes 15%, assignments 10%, midterm
                        25%, and terminal 50%.
                      </p>
                    </div>
                  </div>

                  <div className="grade-workspace__subject-analyzer">
                    <div className="grade-workspace__subject-fields">
                      <div>
                        <label
                          className="grade-workspace__label"
                          htmlFor={`${componentId}-sessional-subject`}
                        >
                          Subject name
                        </label>
                        <input
                          id={`${componentId}-sessional-subject`}
                          type="text"
                          value={sessionalSubjectName}
                          onChange={(event) =>
                            setSessionalSubjectName(event.target.value)
                          }
                          placeholder="e.g. Database Systems"
                        />
                      </div>
                      <div>
                        <label
                          className="grade-workspace__label"
                          htmlFor={`${componentId}-sessional-credit-hours`}
                        >
                          Credit hours
                        </label>
                        <input
                          id={`${componentId}-sessional-credit-hours`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="6"
                          step="1"
                          value={sessionalInputs.creditHours}
                          onChange={(event) =>
                            setSessionalInputs((current) => ({
                              ...current,
                              creditHours: event.target.value,
                            }))
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
                        onClick={() =>
                          sessionalImageInputRef.current?.click()
                        }
                        disabled={isScanningSubject}
                      >
                        <span
                          className={
                            isScanningSubject
                              ? "material-symbols-outlined is-spinning"
                              : "material-symbols-outlined"
                          }
                          aria-hidden="true"
                        >
                          {isScanningSubject ? "progress_activity" : "upload"}
                        </span>
                        <span>
                          {isScanningSubject
                            ? "Analyzing..."
                            : "Analyze marks screenshot"}
                        </span>
                      </button>
                      {scanImageName ? (
                        <small
                          className="grade-workspace__file-name"
                          title={scanImageName}
                        >
                          {scanImageName}
                        </small>
                      ) : (
                        <small>PNG, JPEG, or WebP · up to 3 MB</small>
                      )}
                    </div>
                  </div>

                  <div className="grade-workspace__form-grid">
                    {SESSIONAL_THEORY_FIELDS.map((field) => {
                      const fieldId = `${componentId}-sessional-${field.key}`;
                      return (
                        <div key={field.key}>
                          <label
                            className="grade-workspace__label"
                            htmlFor={fieldId}
                          >
                            {field.label}{" "}
                            <span className="grade-workspace__label-hint">
                              (out of {field.max})
                            </span>
                          </label>
                          <input
                            id={fieldId}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={field.max}
                            step="0.5"
                            value={sessionalInputs[field.key]}
                            onChange={(event) =>
                              setSessionalInputs((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grade-workspace__subpanel">
                    <div className="grade-workspace__subpanel-head">
                      <div>
                        <h3>1-credit lab component</h3>
                        <p>
                          Weighted as assignment 25%, midterm 25%, and final
                          50%, combined by credit hours.
                        </p>
                      </div>
                      <label className="grade-workspace__switch">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={sessionalInputs.hasLab}
                          onChange={(event) =>
                            setSessionalInputs((current) => ({
                              ...current,
                              hasLab: event.target.checked,
                            }))
                          }
                          aria-label="Include 1-credit lab marks"
                        />
                        <span className="grade-workspace__switch-track" />
                      </label>
                    </div>

                    {sessionalInputs.hasLab ? (
                      <div className="grade-workspace__lab-list">
                        {SESSIONAL_LAB_FIELDS.map((item) => {
                          const obtainedId = `${componentId}-sessional-${item.obtainedKey}`;
                          const totalId = `${componentId}-sessional-${item.totalKey}`;
                          return (
                            <div
                              className="grade-workspace__lab-row"
                              key={item.obtainedKey}
                            >
                              <div className="grade-workspace__lab-title">
                                <strong>{item.label}</strong>
                                <span>{item.weight} weight</span>
                              </div>
                              <div className="grade-workspace__pair-inputs">
                                <div>
                                  <label
                                    className="grade-workspace__label"
                                    htmlFor={obtainedId}
                                  >
                                    Obtained
                                  </label>
                                  <input
                                    id={obtainedId}
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={sessionalInputs[item.totalKey]}
                                    step="0.5"
                                    value={sessionalInputs[item.obtainedKey]}
                                    onChange={(event) =>
                                      setSessionalInputs((current) => ({
                                        ...current,
                                        [item.obtainedKey]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label
                                    className="grade-workspace__label"
                                    htmlFor={totalId}
                                  >
                                    Total
                                  </label>
                                  <input
                                    id={totalId}
                                    type="number"
                                    inputMode="decimal"
                                    min="0.5"
                                    max="100"
                                    step="0.5"
                                    value={sessionalInputs[item.totalKey]}
                                    onChange={(event) =>
                                      setSessionalInputs((current) => ({
                                        ...current,
                                        [item.totalKey]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "nat" ? (
              <div
                id={`${componentId}-panel-nat`}
                role="tabpanel"
                aria-labelledby={`${componentId}-tab-nat`}
                className="grade-workspace__tabpanel"
              >
                <section
                  className="grade-workspace__panel"
                  aria-labelledby={`${componentId}-nat-title`}
                >
                  <div className="grade-workspace__panel-head">
                    <div>
                      <h2 id={`${componentId}-nat-title`}>
                        COMSATS NTS NAT aggregate
                      </h2>
                      <p>
                        Weighted as SSC / Matric 10%, HSSC / Intermediate 40%,
                        and NTS NAT 50%.
                      </p>
                    </div>
                  </div>

                  <div className="grade-workspace__nat-list">
                    {NAT_EXAMS.map(({ exam, label }) => (
                      <fieldset
                        className="grade-workspace__nat-group"
                        key={exam}
                      >
                        <legend>
                          <span>{label}</span>
                          <span className="grade-workspace__weight">
                            {NTS_NAT_WEIGHTS[exam] * 100}% weight
                          </span>
                        </legend>
                        <div className="grade-workspace__pair-inputs">
                          {["Obtained", "Total"].map((kind) => {
                            const field = `${exam}${kind}`;
                            const fieldId = `${componentId}-${field}`;
                            const error =
                              natInputs[field] !== ""
                                ? natResult.errors[field]
                                : undefined;
                            return (
                              <div key={field}>
                                <label
                                  className="grade-workspace__label"
                                  htmlFor={fieldId}
                                >
                                  {kind} marks
                                </label>
                                <input
                                  id={fieldId}
                                  type="number"
                                  inputMode="decimal"
                                  min={kind === "Total" ? "0.01" : "0"}
                                  step="any"
                                  value={natInputs[field]}
                                  placeholder={
                                    kind === "Obtained"
                                      ? "Your marks"
                                      : undefined
                                  }
                                  onChange={(event) =>
                                    setNatInputs((current) => ({
                                      ...current,
                                      [field]: event.target.value,
                                    }))
                                  }
                                  aria-invalid={Boolean(error)}
                                  aria-describedby={
                                    error ? `${fieldId}-error` : undefined
                                  }
                                />
                                {error ? (
                                  <p
                                    className="grade-workspace__field-error"
                                    id={`${fieldId}-error`}
                                  >
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
                    <Icon name="info" />
                    <p>
                      Architecture and Design use different admission weights,
                      so this NAT formula does not apply to those programmes.
                      Closing merit varies by campus, programme, and admission
                      round.
                    </p>
                  </div>
                </section>
              </div>
            ) : null}

            <details className="grade-workspace__reference">
              <summary>
                <span className="grade-workspace__reference-title">
                  <Icon name="book" />
                  <span>COMSATS grade-point reference</span>
                </span>
                <Icon name="chevron" className="grade-workspace__chevron" />
              </summary>

              <div className="grade-workspace__reference-body">
                <div className="grade-workspace__grade-grid">
                  {GRADING_SCALE.map((grade) => (
                    <div
                      className="grade-workspace__grade-cell"
                      key={grade.letter}
                    >
                      <strong>{grade.letter}</strong>
                      <span>{grade.point.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="grade-workspace__reference-note">
                  Values follow COMSATS University’s official grading scale.
                  Confirm applicable rules against your campus academic record.
                </p>
              </div>
            </details>
          </div>

          <aside
            className="grade-workspace__aside"
            aria-label="Calculation summary"
          >
            {activeTab === "semester" ? (
              <section
                className="grade-workspace__result-card"
                aria-labelledby={`${componentId}-result-title`}
              >
                <h2 id={`${componentId}-result-title`}>Semester GPA</h2>

                <div
                  className="grade-workspace__score"
                  aria-live="polite"
                  aria-atomic="true"
                >
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

                <div
                  className="grade-workspace__meter-scale"
                  aria-hidden="true"
                >
                  <span>0.00</span>
                  <span>2.00</span>
                  <span>4.00</span>
                </div>

                <p className="grade-workspace__status">{statusText}</p>

                <dl className="grade-workspace__breakdown">
                  <div>
                    <dt>Completed courses</dt>
                    <dd>
                      {completedCount} / {courses.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Semester credits</dt>
                    <dd>{ready ? totalCredits : "—"}</dd>
                  </div>
                  <div>
                    <dt>Quality points</dt>
                    <dd>{ready ? totalQualityPoints.toFixed(2) : "—"}</dd>
                  </div>
                </dl>

                {includeHistory ? (
                  <div className="grade-workspace__highlight-box">
                    <div className="grade-workspace__highlight-row">
                      <span>Estimated CGPA</span>
                      <strong aria-live="polite">{formatGpa(cgpa)}</strong>
                    </div>
                    <p>
                      {cgpa !== null
                        ? `${netCombinedCredits} combined credit hours${retakeCredits > 0 ? ` (${retakeCredits} retake cr replaced)` : ""}.`
                        : "Complete your courses and previous academic record."}
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="grade-workspace__btn-ghost"
                  onClick={resetCalculator}
                >
                  <Icon name="reset" />
                  <span>Reset calculator</span>
                </button>
              </section>
            ) : null}

            {activeTab === "planner" ? (
              <section
                className="grade-workspace__result-card"
                data-status={targetResult.status}
                aria-labelledby={`${componentId}-planner-result-title`}
              >
                <h2 id={`${componentId}-planner-result-title`}>
                  {targetResult.status === "impossible"
                    ? "Target exceeds 4.00"
                    : targetResult.status === "achieved"
                      ? "Target secured"
                      : "Required future SGPA"}
                </h2>

                <div
                  className="grade-workspace__score"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
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
                    targetResult.status === "invalid"
                      ? 0
                      : Math.min(
                          4,
                          Math.max(
                            0,
                            Number(targetResult.requiredSgpa.toFixed(2)),
                          ),
                        )
                  }
                >
                  <span style={{ width: `${requiredProgress}%` }} />
                </div>

                <div
                  className="grade-workspace__meter-scale"
                  aria-hidden="true"
                >
                  <span>0.00</span>
                  <span>2.00</span>
                  <span>4.00</span>
                </div>

                <p className="grade-workspace__status">
                  {targetResult.status === "invalid"
                    ? "Enter your current CGPA, completed credits, target CGPA, and remaining credits to calculate."
                    : targetResult.status === "impossible"
                      ? `A ${parsedTarget.toFixed(2)} target cannot be reached within ${remainingCreditCount} remaining credits. Even a 4.00 average yields a ${targetResult.maximumCgpa.toFixed(2)} CGPA.`
                      : targetResult.status === "achieved"
                        ? `Your current quality points already secure a ${parsedTarget.toFixed(2)} CGPA across ${remainingCreditCount} remaining credits.`
                        : `${previousGpa >= parsedTarget ? "Maintain" : "Aim for"} at least a ${requiredDisplay} credit-weighted average across ${remainingCreditCount} remaining credits.`}
                </p>

                <dl className="grade-workspace__breakdown">
                  <div>
                    <dt>Current CGPA</dt>
                    <dd>{validPreviousGpa ? previousGpa.toFixed(2) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Remaining credits</dt>
                    <dd>
                      {remainingCreditCount !== null
                        ? remainingCreditCount
                        : "—"}
                    </dd>
                  </div>
                  {targetResult.status !== "invalid" &&
                  Number.isFinite(targetResult.maximumCgpa) ? (
                    <div>
                      <dt>Max possible CGPA</dt>
                      <dd>{targetResult.maximumCgpa.toFixed(2)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {activeTab === "sessional" ? (
              <section
                className="grade-workspace__result-card"
                aria-labelledby={`${componentId}-sessional-result-title`}
              >
                <h2 id={`${componentId}-sessional-result-title`}>
                  Estimated subject grade
                </h2>

                <div
                  className="grade-workspace__score"
                  aria-live="polite"
                  aria-atomic="true"
                >
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

                <div
                  className="grade-workspace__meter-scale"
                  aria-hidden="true"
                >
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>

                <p className="grade-workspace__status">
                  {sessionalInputs.hasLab
                    ? `Theory ${sessionalResult.theoryPct}% and lab ${sessionalResult.labPct}% combined by credit hours.`
                    : `Your estimated subject GPA is ${sessionalResult.point.toFixed(2)} on the COMSATS 4.00 scale.`}
                </p>

                <dl className="grade-workspace__breakdown">
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
                  <Icon name="playlistAdd" />
                  <span>Add to semester courses</span>
                </button>
              </section>
            ) : null}

            {activeTab === "nat" ? (
              <section
                className="grade-workspace__result-card"
                aria-labelledby={`${componentId}-nat-result-title`}
              >
                <h2 id={`${componentId}-nat-result-title`}>
                  Admission aggregate
                </h2>

                <div
                  className="grade-workspace__score"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <strong>
                    {natResult.status === "valid"
                      ? `${natResult.aggregate.toFixed(2)}%`
                      : "—"}
                  </strong>
                  <span>/ 100%</span>
                </div>

                <p className="grade-workspace__status">
                  {natResult.status === "valid"
                    ? "Weighted percentage estimate. Not a merit-list guarantee."
                    : "Enter valid marks for all three exams to calculate your aggregate."}
                </p>

                {natResult.status === "valid" ? (
                  <dl className="grade-workspace__nat-breakdown">
                    {NAT_EXAMS.map(({ exam, label }) => {
                      const maxWeight = NTS_NAT_WEIGHTS[exam] * 100;
                      const contribution = natResult.contributions[exam];
                      const fillPct = Math.min(
                        100,
                        Math.max(0, (contribution / maxWeight) * 100),
                      );
                      return (
                        <div key={exam} className="grade-workspace__nat-row">
                          <div className="grade-workspace__nat-row-head">
                            <dt>{label}</dt>
                            <dd>
                              {contribution.toFixed(2)} / {maxWeight}
                            </dd>
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
              <Icon name="sigma" />
              <div>
                <strong>How GPA is calculated</strong>
                <p>
                  Multiply each course’s grade point by its credit hours, sum
                  the results, and divide by total credits.
                </p>
              </div>
            </div>

            <p className="grade-workspace__disclaimer">
              Planning estimate only, not an official transcript. Official CGPA
              may differ due to rounding or campus academic policies.
            </p>
          </aside>
        </div>
      </div>

      {toastMessage ? (
        <div
          className="grade-workspace__toast"
          role="status"
          aria-live="polite"
        >
          <Icon name="check" />
          <span>{toastMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return <GpaCalculator />;
}
