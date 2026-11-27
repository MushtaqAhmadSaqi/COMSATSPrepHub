import { describe, it, expect, beforeEach, vi } from 'vitest';

const { orSpy, selectSpy, orderSpy } = vi.hoisted(() => ({
  orSpy: vi.fn(),
  selectSpy: vi.fn(),
  orderSpy: vi.fn()
}));

vi.mock('../../src/services/supabase.js', () => {
  const queryChain = {
    select: (...args) => {
      selectSpy(...args);
      return queryChain;
    },
    or: (...args) => {
      orSpy(...args);
      return queryChain;
    },
    order: (...args) => {
      orderSpy(...args);
      return Promise.resolve({ data: [], error: null });
    }
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => queryChain
    }
  };
});

import {
  sanitizeFilterValue,
  fetchPapersForSubjectFromSupabase,
  clearPapersCache
} from '../../src/services/papersService.js';

describe('Suite C — PostgREST Filter Injection Hardening (SEC-06)', () => {
  beforeEach(() => {
    clearPapersCache();
    orSpy.mockClear();
    selectSpy.mockClear();
    orderSpy.mockClear();
  });

  it('strips PostgREST operators, quotes, dots, commas, parens, backslashes, and SQL wildcards', () => {
    expect(sanitizeFilterValue('CSC211),id.eq.1,(')).toBe('CSC211 id eq 1');
    expect(sanitizeFilterValue('subject_code.ilike.%admin%')).toBe('subject code ilike admin');
    expect(sanitizeFilterValue(`CSC101" OR '1'='1\\`)).toBe('CSC101 OR 1 1');
    expect(sanitizeFilterValue('CS_301*%(foo)')).toBe('CS 301 foo');
  });

  it('preserves legitimate COMSATS course codes and hyphenated subject titles', () => {
    expect(sanitizeFilterValue('CSC-211')).toBe('CSC-211');
    expect(sanitizeFilterValue('  Data Structures & Algorithms  ')).toBe(
      'Data Structures Algorithms'
    );
  });

  it('neutralizes filter injection payloads before passing filters to supabase.or()', async () => {
    await fetchPapersForSubjectFromSupabase(
      'CSC211),id.neq.0,(subject_code.eq.ADMIN',
      'Algo%_"test\\()'
    );

    expect(orSpy).toHaveBeenCalledTimes(1);
    const filterArg = orSpy.mock.calls[0][0];
    expect(filterArg).not.toContain(')');
    expect(filterArg).not.toContain('(');
    expect(filterArg).not.toContain('"');
    expect(filterArg).not.toContain("'");
    expect(filterArg).not.toContain('\\');
    // Only fixed template column names (subject_code / subject_name) contain underscores
    expect(filterArg).toMatch(
      /^subject_code\.ilike\.%[A-Za-z0-9\s-]+%,(subject_code\.ilike\.%[A-Za-z0-9\s-]+%,)?subject_name\.ilike\.%[A-Za-z0-9\s-]+%$/
    );
  });
});
