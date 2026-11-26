import { DEFAULT_SUBJECTS, DEPARTMENTS } from './subjects';

/**
 * Derive verified catalog statistics from a single source of truth.
 * When live subjects from Supabase are available, pass them in to keep
 * landing counters, bento previews, and library badges in lockstep.
 */
export function computePlatformStats(subjects = DEFAULT_SUBJECTS) {
  const list = Array.isArray(subjects) && subjects.length > 0 ? subjects : DEFAULT_SUBJECTS;
  const courseCount = list.length;
  const paperCount = list.reduce((sum, item) => sum + (Number(item?.papers) || 0), 0);
  const departmentCount = new Set(list.map((item) => item?.department).filter(Boolean)).size
    || Math.max(1, DEPARTMENTS.length - 1);

  return {
    courseCount,
    paperCount,
    departmentCount,
  };
}

export const DEFAULT_PLATFORM_STATS = computePlatformStats(DEFAULT_SUBJECTS);

export const FEATURED_COURSE_EXAMPLES = ['CSC101', 'CSC211', 'MTH104'];
