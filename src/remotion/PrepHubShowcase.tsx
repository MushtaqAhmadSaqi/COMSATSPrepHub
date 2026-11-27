import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BackdropStack, AnimatedCounter, SlideCard, VectorIcon, WordReveal } from './components/MotionPrimitives';
import { FONTS, SPRINGS, ThemeMode, eased, getThemeTokens } from './theme';

export interface ShowcaseProps {
  theme?: ThemeMode;
}

const COURSES = [
  { code: 'CSC211', name: 'Data Structures & Algorithms', meta: '18 Papers · Midterm & Terminal' },
  { code: 'MTH104', name: 'Calculus & Analytical Geometry', meta: '22 Papers · Model Answers' },
  { code: 'CSC241', name: 'Object-Oriented Programming', meta: '16 Papers · Practice Bank' }
];

const TRANSCRIPT_ROWS = [
  { code: 'CSC211', title: 'Data Structures', credits: '4 Cr', grade: 'A', gp: 4.0 },
  { code: 'MTH104', title: 'Calculus I', credits: '3 Cr', grade: 'A-', gp: 3.7 },
  { code: 'CSC241', title: 'OOP Lab & Theory', credits: '4 Cr', grade: 'A', gp: 4.0 },
  { code: 'PHY121', title: 'Applied Physics', credits: '3 Cr', grade: 'B+', gp: 3.3 }
];

function sceneAlpha(frame: number, start: number, end: number): number {
  const enter = eased(frame, [start, start + 10], [0, 1]);
  const exit = end < 300 ? eased(frame, [end - 10, end], [1, 0]) : 1;
  return enter * exit;
}

/**
 * Interactive 3-act 16:9 study loop mounted inside Home.jsx via @remotion/player.
 * Frames: 0..102 Search | 96..202 Practice MCQ | 196..300 GPA Planner
 */
export const PrepHubShowcase: React.FC<ShowcaseProps> = ({ theme = 'light' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = getThemeTokens(theme);

  const act1Alpha = sceneAlpha(frame, 0, 102);
  const act2Alpha = sceneAlpha(frame, 96, 202);
  const act3Alpha = sceneAlpha(frame, 196, 300);

  const activeStep = frame < 98 ? 0 : frame < 198 ? 1 : 2;
  const stepLabels = ['1. Find Courses', '2. Practice Active Recall', '3. Track Exact GPA'];

  const searchTyped = 'CSC211';
  const charCount = Math.floor(eased(frame, [10, 36], [0, searchTyped.length]));
  const typedText = searchTyped.slice(0, charCount);
  const caretOpacity = frame % 16 < 9 && frame < 44 ? 1 : 0;

  // Act 2: MCQ answer click sweep
  const pickProgress = spring({ frame: frame - 134, fps, config: SPRINGS.crisp });
  const answerRevealed = frame >= 142;

  // Act 3: Ring gauge sweep for 3.84 SGPA
  const circumference = 2 * Math.PI * 64;
  const arcFraction = eased(frame, [212, 260], [0, 3.84 / 4.0]);

  return (
    <BackdropStack theme={t}>
      <AbsoluteFill style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Persistent Top Chrome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: 18
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: t.brand,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <VectorIcon name="book" size={18} color="#ffffff" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
              COMSATS<span style={{ color: t.brand }}>PrepHub</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {stepLabels.map((label, idx) => {
              const isCurrent = idx === activeStep;
              return (
                <div
                  key={label}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: isCurrent ? 700 : 600,
                    background: isCurrent ? t.brandSoft : 'transparent',
                    color: isCurrent ? t.brand : t.textMuted,
                    border: `1px solid ${isCurrent ? t.brand : t.border}`
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Stage */}
        <div style={{ position: 'relative', flex: 1 }}>
          {/* ACT 1: Course & Past Paper Search */}
          {act1Alpha > 0.01 && (
            <AbsoluteFill style={{ opacity: act1Alpha, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <WordReveal
                text="Search any COMSATS course in seconds"
                startFrame={2}
                staggerFrames={4}
                fontSize={40}
                color={t.text}
                accentWord="course"
                accentColor={t.brand}
              />

              {/* Search Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 22px',
                  borderRadius: 18,
                  background: t.surface,
                  border: `2px solid ${t.brand}`,
                  boxShadow: `0 12px 32px ${t.brandSoft}`
                }}
              >
                <VectorIcon name="search" size={22} color={t.brand} />
                <span style={{ fontSize: 22, fontWeight: 600, fontFamily: FONTS.mono }}>
                  {typedText || 'Search course code or name'}
                  <span style={{ opacity: caretOpacity, color: t.accent }}>|</span>
                </span>
              </div>

              {/* Staggered Course Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                {COURSES.map((course, idx) => (
                  <SlideCard
                    key={course.code}
                    startFrame={24 + idx * 5}
                    style={{
                      background: t.surface,
                      border: `1.5px solid ${idx === 0 ? t.brand : t.border}`,
                      borderRadius: 18,
                      padding: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: t.brandSoft,
                        color: t.brand,
                        fontFamily: FONTS.mono,
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      {course.code}
                    </span>
                    <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>{course.name}</div>
                    <div style={{ fontSize: 14, color: t.textMuted }}>{course.meta}</div>
                  </SlideCard>
                ))}
              </div>

              {/* Animated Metrics */}
              <div style={{ display: 'flex', gap: 36, marginTop: 'auto', paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: t.brand }}>
                    <AnimatedCounter target={240} startFrame={30} durationFrames={28} suffix="+" />
                  </div>
                  <div style={{ fontSize: 15, color: t.textMuted }}>Verified Past Papers</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: t.accent }}>
                    <AnimatedCounter target={38} startFrame={34} durationFrames={24} />
                  </div>
                  <div style={{ fontSize: 15, color: t.textMuted }}>COMSATS Courses</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: t.text }}>
                    <AnimatedCounter target={4} startFrame={38} durationFrames={20} />
                  </div>
                  <div style={{ fontSize: 15, color: t.textMuted }}>Academic Departments</div>
                </div>
              </div>
            </AbsoluteFill>
          )}

          {/* ACT 2: Active Recall Quiz & Instant Proof */}
          {act2Alpha > 0.01 && (
            <AbsoluteFill style={{ opacity: act2Alpha, display: 'flex', flexDirection: 'row', gap: 28 }}>
              <div style={{ flex: 1.35, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <WordReveal
                  text="Interactive practice with instant proof"
                  startFrame={100}
                  staggerFrames={4}
                  fontSize={36}
                  color={t.text}
                  accentWord="instant"
                  accentColor={t.brand}
                />

                <SlideCard
                  startFrame={108}
                  style={{
                    background: t.surface,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: 20,
                    padding: 26,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >
                  <div style={{ fontSize: 15, fontFamily: FONTS.mono, color: t.brand, fontWeight: 700 }}>
                    CSC211 · Question 04 / 10
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
                    What is the worst-case time complexity of Merge Sort?
                  </div>

                  {['O(n²)', 'O(n log n)', 'O(log n)'].map((opt, idx) => {
                    const isCorrectOpt = idx === 1;
                    const highlight = isCorrectOpt && frame >= 134;
                    const activeScale = highlight ? 1 + (1 - Math.abs(pickProgress - 0.5) * 2) * 0.018 : 1;

                    return (
                      <div
                        key={opt}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          borderRadius: 12,
                          border: `2px solid ${answerRevealed && isCorrectOpt ? t.success : highlight ? t.brand : t.border}`,
                          background: answerRevealed && isCorrectOpt ? t.successSoft : t.surface2,
                          fontFamily: FONTS.mono,
                          fontSize: 18,
                          fontWeight: 700,
                          transform: `scale(${activeScale.toFixed(4)})`
                        }}
                      >
                        <span>
                          {['A.', 'B.', 'C.'][idx]} {opt}
                        </span>
                        {answerRevealed && isCorrectOpt && (
                          <VectorIcon name="check" size={20} color={t.success} />
                        )}
                      </div>
                    );
                  })}
                </SlideCard>
              </div>

              <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
                <SlideCard
                  startFrame={142}
                  style={{
                    background: t.codeBg,
                    color: t.codeText,
                    borderRadius: 18,
                    padding: 24,
                    border: `1px solid ${t.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 14, color: t.brandLight, fontWeight: 700, fontFamily: FONTS.mono }}>
                    RECURRENCE PROOF
                  </div>
                  <div style={{ fontSize: 22, fontFamily: FONTS.mono, fontWeight: 700 }}>
                    T(n) = 2T(n/2) + cn
                  </div>
                  <div style={{ fontSize: 16, opacity: 0.88, lineHeight: 1.5 }}>
                    Recursion tree depth is log₂n with cn work per level, giving O(n log n) consistently.
                  </div>
                </SlideCard>

                <SlideCard
                  startFrame={150}
                  style={{
                    background: t.surface,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: 16,
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: 16, color: t.textMuted, fontWeight: 600 }}>Session Accuracy</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: t.success }}>
                    <AnimatedCounter target={92} startFrame={152} durationFrames={22} suffix="%" />
                  </span>
                </SlideCard>
              </div>
            </AbsoluteFill>
          )}

          {/* ACT 3: GPA Engine */}
          {act3Alpha > 0.01 && (
            <AbsoluteFill style={{ opacity: act3Alpha, display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'center' }}>
              <div style={{ flex: 1.35, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <WordReveal
                  text="COMSATS 4.00 SGPA computed accurately"
                  startFrame={200}
                  staggerFrames={4}
                  fontSize={36}
                  color={t.text}
                  accentWord="4.00"
                  accentColor={t.accent}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TRANSCRIPT_ROWS.map((row, idx) => (
                    <SlideCard
                      key={row.code}
                      startFrame={206 + idx * 4}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 70px 60px',
                        alignItems: 'center',
                        padding: '14px 18px',
                        borderRadius: 14,
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        fontSize: 16
                      }}
                    >
                      <span style={{ fontFamily: FONTS.mono, fontWeight: 700, color: t.brand }}>{row.code}</span>
                      <span style={{ fontWeight: 600 }}>{row.title}</span>
                      <span style={{ color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>{row.credits}</span>
                      <span style={{ fontWeight: 800, textAlign: 'right', color: t.success, fontVariantNumeric: 'tabular-nums' }}>
                        {row.grade}
                      </span>
                    </SlideCard>
                  ))}
                </div>
              </div>

              <SlideCard
                startFrame={210}
                style={{
                  flex: 0.75,
                  background: t.surface,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: 22,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14
                }}
              >
                <div style={{ position: 'relative', width: 176, height: 176 }}>
                  <svg width="176" height="176" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r="64" fill="none" stroke={t.surface2} strokeWidth="14" />
                    <circle
                      cx="80"
                      cy="80"
                      r="64"
                      fill="none"
                      stroke={t.brand}
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - arcFraction)}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedCounter target={3.84} startFrame={214} durationFrames={38} decimals={2} />
                    </span>
                    <span style={{ fontSize: 14, color: t.textMuted, fontWeight: 600 }}>Semester GPA</span>
                  </div>
                </div>
                <div style={{ fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 1.4 }}>
                  Dean&apos;s Honor Roll eligible with 14 graded credits.
                </div>
              </SlideCard>
            </AbsoluteFill>
          )}
        </div>
      </AbsoluteFill>
    </BackdropStack>
  );
};
