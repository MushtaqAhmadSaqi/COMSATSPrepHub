import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AnimatedCounter, BackdropStack, SlideCard, VectorIcon, WordReveal } from './components/MotionPrimitives';
import { EASE_OUT_CUBIC, FONTS, SPRINGS, ThemeMode, eased, getThemeTokens } from './theme';

export interface LaunchVideoProps {
  theme?: ThemeMode;
}

const SceneIntro: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  return (
    <BackdropStack theme={t}>
      <Audio src={staticFile('sfx/thump.wav')} volume={0.55} />
      <AbsoluteFill style={{ padding: 96, justifyContent: 'center', gap: 28 }}>
        <SlideCard startFrame={2} style={{ alignSelf: 'flex-start' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 22px',
              borderRadius: 14,
              background: t.surface,
              border: `1.5px solid ${t.border}`
            }}
          >
            <VectorIcon name="book" size={26} color={t.brand} />
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
              COMSATS<span style={{ color: t.brand }}>PrepHub</span>
            </span>
          </div>
        </SlideCard>

        <WordReveal
          text="Every Past Paper. Every Semester."
          startFrame={10}
          staggerFrames={5}
          fontSize={88}
          fontWeight={800}
          color={t.text}
          accentWord="Paper."
          accentColor={t.brand}
        />

        <SlideCard startFrame={28}>
          <p style={{ margin: 0, fontSize: 32, color: t.textMuted, maxWidth: 960, lineHeight: 1.4 }}>
            Verified COMSATS exams, AI practice drills, KaTeX math solutions, and exact 4.00 GPA calculation in one student platform.
          </p>
        </SlideCard>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const SceneLibrary: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const frame = useCurrentFrame();
  const query = 'CSC211';
  const typed = query.slice(0, Math.floor(eased(frame, [12, 34], [0, query.length])));

  const cards = [
    { code: 'CSC211', title: 'Data Structures Terminal 2025', meta: 'Dr. Tariq · Fall Semester · 18 Qs' },
    { code: 'CSC241', title: 'Object-Oriented Midterm 2024', meta: 'Dr. Naveed · Spring Semester · 12 Qs' },
    { code: 'MTH104', title: 'Calculus & Geometry Final', meta: 'Model Solutions · KaTeX Ready' }
  ];

  return (
    <BackdropStack theme={t}>
      <Sequence from={18} durationInFrames={16}>
        <Audio src={staticFile('sfx/pop.wav')} volume={0.45} />
      </Sequence>
      <AbsoluteFill style={{ padding: 96, display: 'flex', flexDirection: 'column', gap: 36 }}>
        <WordReveal
          text="Find your exact course code instantly"
          startFrame={4}
          staggerFrames={4}
          fontSize={64}
          color={t.text}
          accentWord="instantly"
          accentColor={t.brand}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '24px 32px',
            borderRadius: 24,
            background: t.surface,
            border: `3px solid ${t.brand}`,
            boxShadow: `0 20px 44px ${t.brandSoft}`
          }}
        >
          <VectorIcon name="search" size={34} color={t.brand} />
          <span style={{ fontFamily: FONTS.mono, fontSize: 36, fontWeight: 700 }}>{typed || 'Search course'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {cards.map((item, idx) => (
            <SlideCard
              key={item.code}
              startFrame={26 + idx * 5}
              style={{
                background: t.surface,
                border: `2px solid ${idx === 0 ? t.brand : t.border}`,
                borderRadius: 24,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: t.brandSoft,
                  color: t.brand,
                  fontFamily: FONTS.mono,
                  fontSize: 22,
                  fontWeight: 700
                }}
              >
                {item.code}
              </span>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.25 }}>{item.title}</div>
              <div style={{ fontSize: 20, color: t.textMuted }}>{item.meta}</div>
            </SlideCard>
          ))}
        </div>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const SceneActiveQuiz: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const frame = useCurrentFrame();
  const selected = frame >= 36;

  return (
    <BackdropStack theme={t}>
      <Sequence from={36} durationInFrames={28}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.5} />
      </Sequence>
      <AbsoluteFill style={{ padding: 96, display: 'flex', flexDirection: 'column', gap: 36 }}>
        <WordReveal
          text="Active quizzes built from COMSATS exams"
          startFrame={4}
          staggerFrames={4}
          fontSize={62}
          color={t.text}
          accentWord="COMSATS"
          accentColor={t.accent}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 36, flex: 1, alignItems: 'center' }}>
          <SlideCard
            startFrame={12}
            style={{
              background: t.surface,
              border: `2px solid ${t.border}`,
              borderRadius: 28,
              padding: 42,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            <span style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700, color: t.brand }}>
              CSC211 · BALANCED BST
            </span>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.35 }}>
              Maximum height difference allowed in an AVL Tree node?
            </div>
            {['0', '1', '2'].map((opt, idx) => {
              const correct = idx === 1;
              return (
                <div
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 26px',
                    borderRadius: 18,
                    fontFamily: FONTS.mono,
                    fontSize: 26,
                    fontWeight: 700,
                    background: selected && correct ? t.successSoft : t.surface2,
                    border: `2px solid ${selected && correct ? t.success : t.border}`
                  }}
                >
                  <span>
                    {['A.', 'B.', 'C.'][idx]} Balance factor |hL - hR| &le; {opt}
                  </span>
                  {selected && correct && <VectorIcon name="check" size={28} color={t.success} />}
                </div>
              );
            })}
          </SlideCard>

          <SlideCard
            startFrame={22}
            style={{
              background: t.codeBg,
              color: t.codeText,
              borderRadius: 28,
              padding: 42,
              display: 'flex',
              flexDirection: 'column',
              gap: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: t.accent, fontSize: 22, fontWeight: 700 }}>
              <VectorIcon name="spark" size={24} color={t.accent} />
              AI &amp; Flashcard Sync
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.35 }}>
              Mistakes queue into Leitner spaced repetition automatically.
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: t.brandLight }}>
              <AnimatedCounter target={94} startFrame={26} durationFrames={30} suffix="%" />
            </div>
          </SlideCard>
        </div>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const SceneOutro: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const frame = useCurrentFrame();
  const circumference = 2 * Math.PI * 108;
  const arc = eased(frame, [14, 70], [0, 3.84 / 4.0], EASE_OUT_CUBIC);

  return (
    <BackdropStack theme={t}>
      <Sequence from={10} durationInFrames={20}>
        <Audio src={staticFile('sfx/pop.wav')} volume={0.4} />
      </Sequence>
      <AbsoluteFill
        style={{
          padding: 96,
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 56,
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <WordReveal
            text="Ready for Finals on day one"
            startFrame={6}
            staggerFrames={4}
            fontSize={74}
            color={t.text}
            accentWord="Finals"
            accentColor={t.brand}
          />
          <SlideCard startFrame={24}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                padding: '22px 38px',
                borderRadius: 999,
                background: '#1e40af',
                color: '#ffffff',
                fontSize: 28,
                fontWeight: 800
              }}
            >
              <span>comsatsprephub.vercel.app</span>
              <VectorIcon name="arrow" size={28} color="#ffffff" />
            </div>
          </SlideCard>
        </div>

        <SlideCard
          startFrame={14}
          style={{
            background: t.surface,
            border: `2px solid ${t.border}`,
            borderRadius: 32,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20
          }}
        >
          <div style={{ position: 'relative', width: 260, height: 260 }}>
            <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="130" cy="130" r="108" fill="none" stroke={t.surface2} strokeWidth="20" />
              <circle
                cx="130"
                cy="130"
                r="108"
                fill="none"
                stroke={t.brand}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - arc)}
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
              <span style={{ fontSize: 64, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCounter target={3.84} startFrame={16} durationFrames={52} decimals={2} />
              </span>
              <span style={{ fontSize: 22, color: t.textMuted, fontWeight: 600 }}>COMSATS SGPA</span>
            </div>
          </div>
        </SlideCard>
      </AbsoluteFill>
    </BackdropStack>
  );
};

/**
 * Studio 16:9 Launch Promo (1920x1080 @ 30fps, 540 frames = 18s).
 */
export const PrepHubLaunchLandscape: React.FC<LaunchVideoProps> = ({ theme = 'dark' }) => {
  useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={135}>
        <SceneIntro themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-right' })}
        timing={springTiming({ config: SPRINGS.smooth, durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={155}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
        <SceneLibrary themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={155}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
        <SceneActiveQuiz themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-bottom' })}
        timing={springTiming({ config: SPRINGS.crisp, durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={140}>
        <SceneOutro themeMode={theme} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
