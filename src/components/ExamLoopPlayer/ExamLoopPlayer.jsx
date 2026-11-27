import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { PrepHubShowcase } from '../../remotion/PrepHubShowcase';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';
import AppIcon from '../ui/AppIcon';
import './ExamLoopPlayer.css';

const CHAPTERS = [
  { id: 'search', label: 'Course Search', frame: 28, start: 0, end: 98, icon: 'search' },
  { id: 'quiz', label: 'Active Recall', frame: 146, start: 98, end: 198, icon: 'quiz' },
  { id: 'gpa', label: 'GPA Planner', frame: 255, start: 198, end: 300, icon: 'calculate' }
];

export default function ExamLoopPlayer({ isDark = false }) {
  const playerRef = useRef(null);
  const prefersReduced = usePrefersReducedMotion();
  const [activeChapter, setActiveChapter] = useState('search');
  const [isPlaying, setIsPlaying] = useState(!prefersReduced);

  const inputProps = useMemo(
    () => ({ theme: isDark ? 'dark' : 'light' }),
    [isDark]
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.addEventListener !== 'function') return undefined;

    const onFrameUpdate = (e) => {
      const f = e?.detail?.frame ?? 0;
      const match = CHAPTERS.find((c) => f >= c.start && f < c.end);
      if (match) {
        setActiveChapter((prev) => (prev === match.id ? prev : match.id));
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, []);

  const handleSeekChapter = (chapter) => {
    setActiveChapter(chapter.id);
    const player = playerRef.current;
    if (!player) return;
    if (typeof player.seekTo === 'function') {
      player.seekTo(chapter.frame);
    }
    if (prefersReduced && typeof player.pause === 'function') {
      player.pause();
    }
  };

  const handleTogglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying && typeof player.pause === 'function') {
      player.pause();
    } else if (typeof player.play === 'function') {
      player.play();
    }
  };

  return (
    <section
      aria-label="Interactive COMSATSPrepHub workflow preview"
      className="exam-loop-section"
    >
      <div className="exam-loop-head">
        <div>
          <h2 className="exam-loop-title">See the study workflow in motion</h2>
          <p className="exam-loop-subtitle">
            From finding your course code to checking proofs and projecting your semester GPA.
          </p>
        </div>

        <div className="exam-loop-controls" role="group" aria-label="Workflow chapters">
          {CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSeekChapter(ch)}
              aria-pressed={activeChapter === ch.id}
              className={`exam-loop-chapter-btn${activeChapter === ch.id ? ' is-active' : ''}`}
            >
              <AppIcon name={ch.icon} size={16} />
              <span>{ch.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause workflow preview' : 'Play workflow preview'}
            className="exam-loop-play-btn"
          >
            <AppIcon name={isPlaying ? 'pause' : 'play_arrow'} size={18} />
          </button>
        </div>
      </div>

      <div className="exam-loop-stage">
        <Player
          ref={playerRef}
          component={PrepHubShowcase}
          inputProps={inputProps}
          durationInFrames={300}
          compositionWidth={1280}
          compositionHeight={720}
          fps={30}
          initialFrame={prefersReduced ? 28 : 0}
          loop={!prefersReduced}
          autoPlay={!prefersReduced}
          controls={false}
          clickToPlay
          className="exam-loop-player"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </section>
  );
}
