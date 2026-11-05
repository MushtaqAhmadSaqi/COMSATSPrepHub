/**
 * gpaEngine.js — Official COMSATS 4.00 Grading Scale & Sessional Marks Engine
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
  { letter: 'F', percentMin: 0, percentMax: 49, point: 0.00, color: 'rose' }
];

export const DEFAULT_SCHEME = {
  theory: { quizWeight: 15, assignmentWeight: 10, midWeight: 25, finalWeight: 50 },
  lab: { assignmentWeight: 25, midWeight: 25, finalWeight: 50 }
};

function toNum(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function getGradeInfo(percentage) {
  const pct = clamp(Math.round(toNum(percentage, 0)), 0, 100);
  const band =
    GRADING_SCALE.find((g) => pct >= g.percentMin && pct <= g.percentMax) ||
    GRADING_SCALE[GRADING_SCALE.length - 1];
  return {
    letter: band.letter,
    point: band.point,
    percentage: pct,
    color: band.color
  };
}

function weightedPart(obtained, maxMarks, weight) {
  const max = Math.max(toNum(maxMarks, 1), 0.1);
  const safeObtained = clamp(toNum(obtained, 0), 0, max);
  const safeWeight = clamp(toNum(weight, 0), 0, 100);
  return (safeObtained / max) * safeWeight;
}

export function calcSessionalCourseResult({
  quizObtained = 12,
  quizTotal = 15,
  assignObtained = 8.5,
  assignTotal = 10,
  midObtained = 20,
  midTotal = 25,
  finalObtained = 40,
  finalTotal = 50,
  hasLab = false,
  labAssignObtained = 20,
  labAssignTotal = 25,
  labMidObtained = 20,
  labMidTotal = 25,
  labFinalObtained = 40,
  labFinalTotal = 50,
  labPercentage,
  creditHours = 3
} = {}) {
  const theoryScore =
    weightedPart(quizObtained, quizTotal, DEFAULT_SCHEME.theory.quizWeight) +
    weightedPart(assignObtained, assignTotal, DEFAULT_SCHEME.theory.assignmentWeight) +
    weightedPart(midObtained, midTotal, DEFAULT_SCHEME.theory.midWeight) +
    weightedPart(finalObtained, finalTotal, DEFAULT_SCHEME.theory.finalWeight);

  const theoryPct = round2(clamp(theoryScore, 0, 100));
  const totalCr = Math.max(toNum(creditHours, 3), 1);

  if (!hasLab) {
    return {
      theoryPct,
      combinedPct: theoryPct,
      ...getGradeInfo(theoryPct)
    };
  }

  const labCr = 1;
  const theoryCr = Math.max(totalCr - labCr, 1);
  const calculatedLabPct =
    weightedPart(labAssignObtained, labAssignTotal, DEFAULT_SCHEME.lab.assignmentWeight) +
    weightedPart(labMidObtained, labMidTotal, DEFAULT_SCHEME.lab.midWeight) +
    weightedPart(labFinalObtained, labFinalTotal, DEFAULT_SCHEME.lab.finalWeight);
  const safeLabPct = clamp(
    labPercentage == null ? calculatedLabPct : toNum(labPercentage, 0),
    0,
    100
  );
  const combinedPct = round2((theoryPct * theoryCr + safeLabPct * labCr) / (theoryCr + labCr));

  return {
    theoryPct,
    labPct: round2(safeLabPct),
    combinedPct,
    ...getGradeInfo(combinedPct)
  };
}
