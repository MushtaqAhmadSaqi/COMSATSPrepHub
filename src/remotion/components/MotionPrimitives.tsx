import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE_OUT_CUBIC, FONTS, RemotionTheme, SPRINGS, eased } from '../theme';

interface BackdropStackProps {
  theme: RemotionTheme;
  children: React.ReactNode;
}

/**
 * 5-layer depth backdrop:
 * Layer 1 BgMesh -> Layer 2 Subtle Blueprint Grid & Film Grain ->
 * Layer 3/4 Content children -> Layer 5 Vignette + Warm Accent Grade
 */
export const BackdropStack: React.FC<BackdropStackProps> = ({ theme, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const breathA = Math.sin(frame / (fps * 2.1)) * 18;
  const breathB = Math.cos(frame / (fps * 2.6)) * 14;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: FONTS.display,
        overflow: 'hidden'
      }}
    >
      {/* Layer 1: Ambient radial mesh orbs */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: -120 + breathA,
            left: '14%',
            width: 680,
            height: 680,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.brandSoft} 0%, transparent 68%)`
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160 + breathB,
            right: '10%',
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accentSoft} 0%, transparent 70%)`
          }}
        />
      </AbsoluteFill>

      {/* Layer 2: Precision academic grid & subtle grain */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(to right, ${theme.gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridLine} 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: 0.035,
          backgroundImage:
            'radial-gradient(rgba(128,128,128,0.6) 1px, transparent 0)',
          backgroundSize: '6px 6px'
        }}
      />

      {/* Layer 3 & 4: Foreground UI cards & kinetic typography */}
      <AbsoluteFill>{children}</AbsoluteFill>

      {/* Layer 5: Subtle optical vignette grade */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, transparent 58%, ${theme.vignette} 100%)`
        }}
      />
    </AbsoluteFill>
  );
};

interface WordRevealProps {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  accentWord?: string;
  accentColor?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center';
}

export const WordReveal: React.FC<WordRevealProps> = ({
  text,
  startFrame = 0,
  staggerFrames = 4,
  fontSize = 48,
  fontWeight = 800,
  color,
  accentWord,
  accentColor,
  lineHeight = 1.15,
  textAlign = 'left'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
        gap: `${Math.round(fontSize * 0.24)}px`,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing: '-0.03em'
      }}
    >
      {words.map((word, idx) => {
        const p = spring({
          frame: frame - startFrame - idx * staggerFrames,
          fps,
          config: SPRINGS.crisp
        });
        const opacity = eased(frame, [startFrame + idx * staggerFrames, startFrame + idx * staggerFrames + 8], [0, 1]);
        const translateY = (1 - p) * 18;
        const isAccent = accentWord && word.toLowerCase().includes(accentWord.toLowerCase());

        return (
          <span
            key={`${word}-${idx}`}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${translateY.toFixed(2)}px)`,
              color: isAccent && accentColor ? accentColor : color
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

interface AnimatedCounterProps {
  target: number;
  startFrame?: number;
  durationFrames?: number;
  decimals?: number;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  startFrame = 0,
  durationFrames = 26,
  decimals = 0,
  suffix = ''
}) => {
  const frame = useCurrentFrame();
  const value = eased(frame, [startFrame, startFrame + durationFrames], [0, target], EASE_OUT_CUBIC);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

interface SlideCardProps {
  startFrame?: number;
  exitFrame?: number;
  exitDuration?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Animates exactly 2-3 entrance properties (opacity, translateY, scale) with optional 10f exit.
 */
export const SlideCard: React.FC<SlideCardProps> = ({
  startFrame = 0,
  exitFrame,
  exitDuration = 10,
  style,
  children
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: SPRINGS.smooth
  });

  const enterOpacity = eased(frame, [startFrame, startFrame + 9], [0, 1]);
  const exitOpacity =
    exitFrame !== undefined
      ? eased(frame, [exitFrame - exitDuration, exitFrame], [1, 0])
      : 1;
  const opacity = enterOpacity * exitOpacity;
  const translateY = (1 - enter) * 20;
  const scale = 0.96 + 0.04 * enter;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const VectorIcon: React.FC<{
  name: 'search' | 'book' | 'check' | 'spark' | 'gpa' | 'arrow';
  size?: number;
  color?: string;
}> = ({ name, size = 20, color = 'currentColor' }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
      </svg>
    );
  }
  if (name === 'gpa') {
    return (
      <svg {...common}>
        <path d="M12 3v18" />
        <path d="M5 12h14" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
      </svg>
    );
  }
  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
};
