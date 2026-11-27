import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AnimatedCounter, BackdropStack, SlideCard, VectorIcon, WordReveal } from './components/MotionPrimitives';
import { FONTS, SPRINGS, ThemeMode, eased, getThemeTokens } from './theme';

export interface ReelProps {
  theme?: ThemeMode;
}

const ReelHook: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  return (
    <BackdropStack theme={t}>
      <Audio src={staticFile('sfx/thump.wav')} volume={0.55} />
      <AbsoluteFill style={{ padding: 72, justifyContent: 'center', gap: 36 }}>
        <WordReveal
          text="Midterm tomorrow?"
          startFrame={2}
          staggerFrames={5}
          fontSize={86}
          color={t.accent}
        />
        <WordReveal
          text="Every COMSATS paper is 2 clicks away."
          startFrame={16}
          staggerFrames={4}
          fontSize={72}
          color={t.text}
          accentWord="COMSATS"
          accentColor={t.brand}
        />
        <SlideCard
          startFrame={42}
          style={{
            marginTop: 28,
            padding: 36,
            borderRadius: 28,
            background: t.surface,
            border: `2px solid ${t.brand}`,
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}
        >
          <VectorIcon name="search" size={34} color={t.brand} />
          <span style={{ fontFamily: FONTS.mono, fontSize: 34, fontWeight: 700 }}>CSC211 · MTH104 · CSC241</span>
        </SlideCard>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const ReelPapers: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const items = [
    { code: 'CSC211', title: 'Data Structures & Algorithms', count: '18 Papers' },
    { code: 'MTH104', title: 'Calculus & Analytical Geometry', count: '22 Papers' },
    { code: 'CSC241', title: 'Object-Oriented Programming', count: '16 Papers' }
  ];

  return (
    <BackdropStack theme={t}>
      <Sequence from={12} durationInFrames={16}>
        <Audio src={staticFile('sfx/pop.wav')} volume={0.45} />
      </Sequence>
      <AbsoluteFill style={{ padding: 72, justifyContent: 'center', gap: 32 }}>
        <WordReveal
          text="Verified faculty papers with answers"
          startFrame={4}
          staggerFrames={4}
          fontSize={68}
          color={t.text}
          accentWord="answers"
          accentColor={t.brand}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
          {items.map((item, idx) => (
            <SlideCard
              key={item.code}
              startFrame={16 + idx * 6}
              style={{
                padding: 34,
                borderRadius: 26,
                background: t.surface,
                border: `2px solid ${idx === 0 ? t.brand : t.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 28, fontWeight: 800, color: t.brand }}>
                  {item.code}
                </span>
                <span style={{ fontSize: 22, color: t.textMuted, fontWeight: 600 }}>{item.count}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{item.title}</div>
            </SlideCard>
          ))}
        </div>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const ReelQuiz: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const frame = useCurrentFrame();
  const revealed = frame >= 34;

  return (
    <BackdropStack theme={t}>
      <Sequence from={34} durationInFrames={28}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.5} />
      </Sequence>
      <AbsoluteFill style={{ padding: 72, justifyContent: 'center', gap: 34 }}>
        <WordReveal
          text="Drill tough MCQs with AI hints"
          startFrame={4}
          staggerFrames={4}
          fontSize={68}
          color={t.text}
          accentWord="MCQs"
          accentColor={t.brand}
        />
        <SlideCard
          startFrame={14}
          style={{
            background: t.surface,
            border: `2px solid ${t.border}`,
            borderRadius: 30,
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.35 }}>
            Which traversal outputs a BST in sorted ascending order?
          </div>
          {['Preorder', 'Inorder', 'Level-order'].map((opt, idx) => {
            const correct = idx === 1;
            return (
              <div
                key={opt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 28px',
                  borderRadius: 20,
                  fontFamily: FONTS.mono,
                  fontSize: 30,
                  fontWeight: 700,
                  background: revealed && correct ? t.successSoft : t.surface2,
                  border: `2.5px solid ${revealed && correct ? t.success : t.border}`
                }}
              >
                <span>{opt}</span>
                {revealed && correct && <VectorIcon name="check" size={30} color={t.success} />}
              </div>
            );
          })}
        </SlideCard>
      </AbsoluteFill>
    </BackdropStack>
  );
};

const ReelOutro: React.FC<{ themeMode: ThemeMode }> = ({ themeMode }) => {
  const t = getThemeTokens(themeMode);
  const frame = useCurrentFrame();
  const widthPct = eased(frame, [14, 52], [0, 96]);

  return (
    <BackdropStack theme={t}>
      <Sequence from={12} durationInFrames={16}>
        <Audio src={staticFile('sfx/pop.wav')} volume={0.45} />
      </Sequence>
      <AbsoluteFill style={{ padding: 72, justifyContent: 'center', alignItems: 'center', gap: 40 }}>
        <WordReveal
          text="Study smarter on COMSATSPrepHub"
          startFrame={4}
          staggerFrames={4}
          fontSize={72}
          color={t.text}
          accentWord="COMSATSPrepHub"
          accentColor={t.brand}
          textAlign="center"
        />

        <SlideCard
          startFrame={14}
          style={{
            width: '100%',
            background: t.surface,
            border: `2px solid ${t.border}`,
            borderRadius: 30,
            padding: 44,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: 28, color: t.textMuted, fontWeight: 600 }}>Projected COMSATS SGPA</span>
          <span style={{ fontSize: 96, fontWeight: 800, color: t.brand, fontVariantNumeric: 'tabular-nums' }}>
            <AnimatedCounter target={3.84} startFrame={16} durationFrames={38} decimals={2} />
          </span>
          <div style={{ width: '100%', height: 14, borderRadius: 999, background: t.surface2, overflow: 'hidden' }}>
            <div style={{ width: `${widthPct}%`, height: '100%', background: t.brand, borderRadius: 999 }} />
          </div>
        </SlideCard>

        <SlideCard startFrame={30}>
          <div
            style={{
              padding: '24px 44px',
              borderRadius: 999,
              background: '#1e40af',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 800
            }}
          >
            comsatsprephub.vercel.app
          </div>
        </SlideCard>
      </AbsoluteFill>
    </BackdropStack>
  );
};

/**
 * Studio 9:16 Vertical Reel/Shorts Promo (1080x1920 @ 30fps, 450 frames = 15s).
 */
export const PrepHubReelVertical: React.FC<ReelProps> = ({ theme = 'dark' }) => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={130}>
        <ReelHook themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-bottom' })}
        timing={springTiming({ config: SPRINGS.crisp, durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={130}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
        <ReelPapers themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={125}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
        <ReelQuiz themeMode={theme} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-right' })}
        timing={springTiming({ config: SPRINGS.smooth, durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={110}>
        <ReelOutro themeMode={theme} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
