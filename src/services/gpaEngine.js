/**
 * gpaEngine.js — COMSATS GPA & Marks Calculation Service
 * Fully ported & modernized for React from legacy gpa-logic.js
 */

export const GRADING_SCALE = [
  { letter: 'A', percentMin: 85, percentMax: 100, point: 4.00, color: 'emerald' },
  { letter: 'A-', percentMin: 80, percentMax: 84, point: 3.66, color: 'emerald' },
  { letter: 'B+', percentMin: 75, percentMax: 79, point: 3.33, color: 'sky' },
  { letter: 'B', percentMin: 71, percentMax: 74, point: 3.00, color: 'sky' },
  { letter: 'B-', percentMin: 68, percentMax: 70, point: 2.66, color: 'sky' },
  { letter: 'C+', percentMin: 64, percentMax: 67, point: 2.33, color: 'amber' },
  { letter: 'C', percentMin: 60, percentMax: 63, point: 2.00, color: 'amber' },
  { letter: 'C-', percentMin: 57, percentMax: 59, point: 1.67, color: 'orange' },
  { letter: 'D+', percentMin: 53, percentMax: 56, point: 1.33, color: 'red' },
  { letter: 'D', percentMin: 50, percentMax: 52, point: 1.00, color: 'red' },
  { letter: 'F', percentMin: 0, percentMax: 49, point: 0.00, color: 'rose' },
];

export const DEFAULT_SCHEME = {
  theory: {
    quizWeight: 15,
    assignmentWeight: 10,
    midWeight: 25,
    finalWeight: 50,
  },
  lab: {
    assignmentWeight: 25,
    midWeight: 25,
    finalWeight: 50,
  },
};

export function toNum(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function getGradeInfo(percentage) {
  const pct = clamp(Math.round(toNum(percentage, 0)), 0, 100);
  const band = GRADING_SCALE.find(g => pct >= g.percentMin && pct <= g.percentMax) || GRADING_SCALE[GRADING_SCALE.length - 1];
  return {
    letter: band.letter,
    point: band.point,
    percentage: pct,
    color: band.color,
  };
}

function sumMarks(items = []) {
  return items.reduce(
    (acc, item) => {
      const total = Math.max(toNum(item?.total, 0), 0.1);
      const obtained = clamp(toNum(item?.obtained, 0), 0, total);
      return {
        obtained: acc.obtained + obtained,
        total: acc.total + total,
      };
    },
    { obtained: 0, total: 0 }
  );
}

function weightedPart(obtained, maxMarks, weight) {
  const max = Math.max(toNum(maxMarks, 1), 0.1);
  const safeObtained = clamp(toNum(obtained, 0), 0, max);
  const safeWeight = clamp(toNum(weight, 0), 0, 100);
  return (safeObtained / max) * safeWeight;
}

export function calcTheoryTotal(fields = {}, schemeInput = DEFAULT_SCHEME.theory) {
  const scheme = {
    quizWeight: clamp(toNum(schemeInput.quizWeight, 15), 0, 100),
    assignmentWeight: clamp(toNum(schemeInput.assignmentWeight, 10), 0, 100),
    midWeight: clamp(toNum(schemeInput.midWeight, 25), 0, 100),
    finalWeight: clamp(toNum(schemeInput.finalWeight, 50), 0, 100),
  };

  const quizStats = sumMarks(fields.quizzes);
  const assignmentStats = sumMarks(fields.assignments);

  const midObtained = toNum(fields.mid?.obtained, 0);
  const midTotal = Math.max(toNum(fields.mid?.total, 25), 0.1);

  const finalObtained = toNum(fields.final?.obtained, 0);
  const finalTotal = Math.max(toNum(fields.final?.total, 50), 0.1);

  const parts = [
    weightedPart(quizStats.obtained, quizStats.total || 1, scheme.quizWeight),
    weightedPart(assignmentStats.obtained, assignmentStats.total || 1, scheme.assignmentWeight),
    weightedPart(midObtained, midTotal, scheme.midWeight),
    weightedPart(finalObtained, finalTotal, scheme.finalWeight),
  ];

  const totalWeight = scheme.quizWeight + scheme.assignmentWeight + scheme.midWeight + scheme.finalWeight;
  if (totalWeight <= 0) return 0;

  const weightedSum = parts.reduce((sum, v) => sum + v, 0);
  return round2(clamp((weightedSum / totalWeight) * 100, 0, 100));
}

export function calcLabTotal(fields = {}, schemeInput = DEFAULT_SCHEME.lab) {
  const scheme = {
    assignmentWeight: clamp(toNum(schemeInput.assignmentWeight, 25), 0, 100),
    midWeight: clamp(toNum(schemeInput.midWeight, 25), 0, 100),
    finalWeight: clamp(toNum(schemeInput.finalWeight, 50), 0, 100),
  };

  const labAssignmentStats = sumMarks(fields.labAssignments);

  const midObtained = toNum(fields.labMid?.obtained, 0);
  const midTotal = Math.max(toNum(fields.labMid?.total, 25), 0.1);

  const finalObtained = toNum(fields.labFinal?.obtained, 0);
  const finalTotal = Math.max(toNum(fields.labFinal?.total, 50), 0.1);

  const parts = [
    weightedPart(labAssignmentStats.obtained, labAssignmentStats.total || 1, scheme.assignmentWeight),
    weightedPart(midObtained, midTotal, scheme.midWeight),
    weightedPart(finalObtained, finalTotal, scheme.finalWeight),
  ];

  const totalWeight = scheme.assignmentWeight + scheme.midWeight + scheme.finalWeight;
  if (totalWeight <= 0) return 0;

  const weightedSum = parts.reduce((sum, v) => sum + v, 0);
  return round2(clamp((weightedSum / totalWeight) * 100, 0, 100));
}

export function calcFinalPercentage(theoryTotal, labTotal, hasLab, creditHours = 3) {
  const theory = clamp(toNum(theoryTotal, 0), 0, 100);
  const lab = clamp(toNum(labTotal, 0), 0, 100);
  const totalCr = Math.max(toNum(creditHours, 3), 0.5);

  if (!hasLab) return round2(theory);

  const labCr = 1;
  const theoryCr = Math.max(totalCr - labCr, 1);
  return round2((theory * theoryCr + lab * labCr) / (theoryCr + labCr));
}

export function calcOverallGpa(subjects = []) {
  let totalQualityPoints = 0;
  let totalCredits = 0;

  subjects.forEach((subj) => {
    const credits = Math.max(toNum(subj.creditHours, 3), 0.5);
    const gpa = clamp(toNum(subj.gpa, 0), 0, 4);

    totalCredits += credits;
    totalQualityPoints += gpa * credits;
  });

  return totalCredits > 0 ? round2(totalQualityPoints / totalCredits) : 0;
}

export function calcTotalCredits(subjects = []) {
  return round2(subjects.reduce((sum, s) => sum + Math.max(toNum(s.creditHours, 3), 0.5), 0));
}

export function getPerformanceLabel(gpa) {
  const val = toNum(gpa, 0);
  if (val >= 3.67) return '🏆 Outstanding Performance! (Deans List Candidate)';
  if (val >= 3.33) return '🌟 Very Good Standing. Keep up the high score!';
  if (val >= 3.00) return '👍 Good Standing. Room to reach A grade.';
  if (val >= 2.67) return '📈 Satisfactory Average. Focus on core subjects.';
  if (val >= 2.00) return '⚠️ Pass Standing. Needs improvement.';
  if (val > 0) return '🚨 At Risk. Serious focus required.';
  return 'Add subjects above to calculate your SGPA.';
}

export function calculateCGPA(prevCgpa, prevCredits, semesterGpa, semesterCredits) {
  const oldCgpa = clamp(toNum(prevCgpa, 0), 0, 4);
  const oldCr = Math.max(toNum(prevCredits, 0), 0);
  const semGpa = clamp(toNum(semesterGpa, 0), 0, 4);
  const semCr = Math.max(toNum(semesterCredits, 0), 0);

  const totalCr = oldCr + semCr;
  if (totalCr <= 0) return { cgpa: '0.00', totalCredits: 0 };

  const combinedPoints = oldCgpa * oldCr + semGpa * semCr;
  return {
    cgpa: (combinedPoints / totalCr).toFixed(2),
    totalCredits: totalCr,
  };
}
