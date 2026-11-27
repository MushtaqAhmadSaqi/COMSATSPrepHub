import { Easing, interpolate } from 'remotion';

export type ThemeMode = 'light' | 'dark';

export interface RemotionTheme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surface2: string;
  brand: string;
  brand2: string;
  brandLight: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  brandSoft: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  codeBg: string;
  codeText: string;
  gridLine: string;
  vignette: string;
}

const LIGHT_THEME: RemotionTheme = {
  mode: 'light',
  bg: '#f7f8fa',
  surface: '#ffffff',
  surface2: '#eef2f6',
  brand: '#1e40af',
  brand2: '#2563eb',
  brandLight: '#38bdf8',
  accent: '#d97706',
  text: '#0f172a',
  textMuted: '#475569',
  border: 'rgba(15, 23, 42, 0.12)',
  brandSoft: 'rgba(30, 64, 175, 0.09)',
  accentSoft: 'rgba(217, 119, 6, 0.12)',
  success: '#047857',
  successSoft: 'rgba(4, 120, 87, 0.1)',
  danger: '#dc2626',
  codeBg: '#0f172a',
  codeText: '#e2e8f0',
  gridLine: 'rgba(15, 23, 42, 0.05)',
  vignette: 'rgba(15, 23, 42, 0.06)'
};

const DARK_THEME: RemotionTheme = {
  mode: 'dark',
  bg: '#090e1a',
  surface: '#111827',
  surface2: '#1e293b',
  brand: '#60a5fa',
  brand2: '#3b82f6',
  brandLight: '#38bdf8',
  accent: '#fbbf24',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: 'rgba(148, 163, 184, 0.2)',
  brandSoft: 'rgba(96, 165, 250, 0.14)',
  accentSoft: 'rgba(251, 191, 36, 0.14)',
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  danger: '#f87171',
  codeBg: '#0b1220',
  codeText: '#e2e8f0',
  gridLine: 'rgba(148, 163, 184, 0.07)',
  vignette: 'rgba(2, 6, 23, 0.45)'
};

export function getThemeTokens(mode: ThemeMode = 'light'): RemotionTheme {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export const FONTS = {
  display: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
};

export const SPRINGS = {
  crisp: { damping: 16, stiffness: 190, mass: 0.9 },
  smooth: { damping: 20, stiffness: 120, mass: 1 },
  bouncy: { damping: 12, stiffness: 170, mass: 0.85 }
};

export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_OUT_CUBIC = Easing.out(Easing.cubic);
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Clamped, explicitly eased interpolation helper (zero linear defaults).
 */
export function eased(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  easing: (t: number) => number = EASE_OUT_EXPO
): number {
  return interpolate(frame, inputRange, outputRange, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
}

export function sec(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}
