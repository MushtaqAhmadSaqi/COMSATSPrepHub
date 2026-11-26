import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import { recordQuizAttempt, getStudentPrefs, getRevisionDeckIds, toggleRevisionCard, quizQuestionToFlashcard } from '../../utils/studyTracker';
import { canSubmitAnswer, scoreAnswers, getAnswerState } from '../../utils/quizSession';
import { fireConfetti } from '../../utils/confetti';
import { useToast } from '../../utils/toast';
import { SubjectCardSkeleton } from '../../components/ui/Skeleton';
import PageHeader from '../../components/PageHeader/PageHeader';
import Modal from '../../components/ui/Modal';
import AppIcon from '../../components/ui/AppIcon';
import './Quiz.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const LETTERS = ['A', 'B', 'C', 'D'];

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

/* Bilingual helper for step-by-step explanations */
function buildStepByStepExplanation(q, lang = 'en') {
  const correctOpt = q.options?.[q.correct] ?? '';
  if (lang === 'ur') {
    return `درست جواب "${LETTERS[q.correct]}: ${correctOpt}" ہے۔ وضاحت: ${
      q.hint || 'یہ تصور کامسیٹس کے امتحانات میں بنیادی اہمیت رکھتا ہے۔'
    } (Step 1: سوال کے کلیدی تصور کو پہچانیں → Step 2: غلط آپشنز کو خارج کریں → Step 3: درست اصول لاگو کریں)۔`;
  }
  return `Step 1: Identify the core concept tested in "${q.question}". Step 2: Option ${LETTERS[q.correct]} ("${correctOpt}") directly satisfies the condition. Step 3: ${
    q.hint || 'Review lecture notes on this topic for similar exam variations.'
  }`;
}

/* ── Animated Option Button ── */
function AnimatedOption({ letter, opt, index, selectedOption, revealed, correct, onClick, disabled }) {
  let optionClass = 'quiz-option-btn';
  if (selectedOption === index) optionClass += ' selected';
  if (revealed) {
    if (index === correct) optionClass += ' correct';
    else if (selectedOption === index) optionClass += ' incorrect';
  }

  return (
    <motion.button
      key={index}
      type="button"
      className={optionClass}
      onClick={() => !revealed && onClick(index)}
      disabled={disabled}
      aria-pressed={selectedOption === index}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <span className="quiz-option-letter mono-code">{letter}</span>
      <span style={{ flex: 1 }}>{opt}</span>
      {revealed && index === correct && (
        <AppIcon name="check_circle" size={20} style={{ color: '#10b981' }} />
      )}
      {revealed && selectedOption === index && index !== correct && (
        <AppIcon name="cancel" size={20} style={{ color: '#ef4444' }} />
      )}
    </motion.button>
  );
}

export default function Quiz({ onExamActiveChange }) {
  const [step, setStep] = useState('select');
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [quizMode, setQuizMode] = useState('practice'); // 'practice' | 'timed'
  const [timeLeftSec, setTimeLeftSec] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [explainLang, setExplainLang] = useState(() => getStudentPrefs().lang || 'en');
  const [markedForReview, setMarkedForReview] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [error, setError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(null);
  const [revisionIds, setRevisionIds] = useState(() => getRevisionDeckIds());

  const toast = useToast();
  const prevStreakRef = useRef(0);
  const finishedRef = useRef(false);
  const finishQuizRef = useRef(() => {});
  const startedAtRef = useRef(null);
  const navigatorRef = useRef(null);
  const score = scoreAnswers(userAnswers);

  // Distraction-free exam mode: hide the site chrome only while a timed exam runs
  useEffect(() => {
    const active = step === 'playing' && quizMode === 'timed';
    onExamActiveChange?.(active);
    return () => onExamActiveChange?.(false);
  }, [step, quizMode, onExamActiveChange]);

  const loadSubjects = async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const data = await fetchSubjectsFromSupabase();
      setSubjects(data || []);
    } catch {
      setSubjectsError('Couldn’t load subjects. Try again.');
    } finally {
      setSubjectsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // Timer countdown when in timed mode
  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setStep('configure');
  };

  const startQuizWithQuestions = (questionList) => {
    setQuestions(questionList);
    setCurrentIdx(0);
    setSelectedOption(null);
    setRevealed(false);
    setStreak(0);
    setShowHint(false);
    setShowStepByStep(false);
    setMarkedForReview({});
    setUserAnswers({});
    setConfirmExit(false);
    setConfirmFinish(false);
    setElapsedSec(null);
    startedAtRef.current = Date.now();
    finishedRef.current = false;
    if (quizMode === 'timed') {
      setTimeLeftSec(questionList.length * 45);
    }
    setStep('playing');
  };

  const handleGenerateQuiz = async () => {
    if (!selectedSubject) return;
    setStep('loading');
    setError('');
    try {
      const generatedQuestions = await generateQuizWithGemini({
        subject: selectedSubject.name,
        subjectCode: selectedSubject.code,
        numQuestions,
        difficulty
      });
      startQuizWithQuestions(generatedQuestions);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz. Please try again.');
      setStep('configure');
    }
  };

  const handleSubmitAnswer = () => {
    if (!canSubmitAnswer(userAnswers, currentIdx, selectedOption)) return;
    setRevealed(true);
    const isCorrect = selectedOption === questions[currentIdx].correct;
    setUserAnswers((prev) => ({
      ...prev,
      [currentIdx]: { selected: selectedOption, isCorrect }
    }));
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      prevStreakRef.current = newStreak;
    } else {
      setStreak(0);
      prevStreakRef.current = 0;
    }
  };

  const finishQuiz = () => {
    if (finishedRef.current || questions.length === 0) return;
    finishedRef.current = true;
    setElapsedSec(Math.max(0, Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000)));

    const wrongQuestions = questions.filter((_, idx) => !userAnswers[idx]?.isCorrect);
    const pct = Math.round((score / questions.length) * 100);
    recordQuizAttempt({
      subject: selectedSubject?.name || 'Practice Quiz',
      subjectCode: selectedSubject?.code || '',
      score,
      totalQuestions: questions.length,
      difficulty,
      wrongTopics: wrongQuestions.map((wq) => wq.question.slice(0, 70))
    });
    if (pct >= 70) {
      fireConfetti({ count: 100, spread: 80, originY: 0.5 });
    }
    setStep('finished');
  };

  useEffect(() => {
    finishQuizRef.current = finishQuiz;
  });

  useEffect(() => {
    if (step !== 'playing' || quizMode !== 'timed') return undefined;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, quizMode]);

  useEffect(() => {
    if (step === 'playing' && quizMode === 'timed' && timeLeftSec === 0) {
      finishQuizRef.current();
    }
  }, [step, quizMode, timeLeftSec]);

  const unansweredCount = questions.length - Object.keys(userAnswers).length;
  const flaggedCount = Object.values(markedForReview).filter(Boolean).length;

  const requestFinish = () => {
    if (unansweredCount > 0 || flaggedCount > 0) {
      setConfirmFinish(true);
    } else {
      finishQuiz();
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      requestFinish();
      return;
    }

    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    const nextState = getAnswerState(userAnswers, nextIdx);
    setSelectedOption(nextState.selectedOption);
    setRevealed(nextState.revealed);
    setShowHint(false);
    setShowStepByStep(false);
  };

  const handlePrevQuestion = () => {
    if (currentIdx === 0) return;
    const prevIdx = currentIdx - 1;
    setCurrentIdx(prevIdx);
    const prevState = getAnswerState(userAnswers, prevIdx);
    setSelectedOption(prevState.selectedOption);
    setRevealed(prevState.revealed);
    setShowHint(false);
    setShowStepByStep(false);
  };

  const handleJumpToQuestion = (idx) => {
    setCurrentIdx(idx);
    const answerState = getAnswerState(userAnswers, idx);
    setSelectedOption(answerState.selectedOption);
    setRevealed(answerState.revealed);
    setShowHint(false);
    setShowStepByStep(false);
  };

  const toggleMarkReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [currentIdx]: !prev[currentIdx]
    }));
  };

  const handleRetryWrongQuestions = () => {
    const wrongOnly = questions.filter((_, idx) => !userAnswers[idx]?.isCorrect);
    if (wrongOnly.length === 0) return;
    startQuizWithQuestions(wrongOnly);
    toast.info(`Retrying ${wrongOnly.length} missed question(s)!`);
  };

  const handleShareResult = async () => {
    const pct = Math.round((score / questions.length) * 100);
    const shareText = `I scored ${score}/${questions.length} (${pct}%) on the ${selectedSubject?.code || ''} ${selectedSubject?.name || 'COMSATS'} Quiz on COMSATSPrepHub! Try it: ${window.location.origin}/#quiz`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        toast.success('Result summary copied to clipboard!');
      }
    } catch {
      // fallback to WhatsApp
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleRestart = () => {
    setStep('select');
    setSelectedSubject(null);
    setQuestions([]);
    setCurrentIdx(0);
    setSelectedOption(null);
    setRevealed(false);
    setStreak(0);
    setShowHint(false);
    setError('');
    finishedRef.current = false;
  };

  useEffect(() => {
    if (step !== 'playing' || questions.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const activeElement = document.activeElement;
      if (activeElement?.isContentEditable || activeElement?.closest('button, a[href], input, textarea, select, [role="button"], [role="dialog"]')) return;

      const key = e.key;
      const lowerKey = String(key).toLowerCase();
      const letterIdx = ['a', 'b', 'c', 'd'].indexOf(lowerKey);
      if (['1', '2', '3', '4'].includes(key) || letterIdx !== -1) {
        const optionIdx = letterIdx !== -1 ? letterIdx : parseInt(key, 10) - 1;
        const currentQ = questions[currentIdx];
        if (currentQ && currentQ.options && currentQ.options[optionIdx] !== undefined && !revealed) {
          setSelectedOption(optionIdx);
        }
      } else if (key === 'Enter') {
        e.preventDefault();
        if (!revealed) {
          if (selectedOption !== null) {
            handleSubmitAnswer();
          }
        } else {
          handleNextQuestion();
        }
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        handleNextQuestion();
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Keep the current question pill in view inside the compact mobile navigator
  useEffect(() => {
    const nav = navigatorRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const active = nav.querySelector('[aria-current="step"]');
    if (!active) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [currentIdx, step]);

  // SELECT SUBJECT
  if (step === 'select') {
    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeader
          badge="Practice"
          title="Practice Quiz"
          subtitle="Choose a COMSATS course to start a timed or practice MCQ session with instant explanations."
        />

        <div className="quiz-search-wrapper">
          <label htmlFor="quiz-subject-search" className="quiz-search-label">
            Search subjects
          </label>
          <input
            id="quiz-subject-search"
            type="text"
            spellCheck={false}
            autoComplete="off"
            className="quiz-search-input"
            placeholder="Search by course name or code (e.g. CSC211)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search subjects"
          />
        </div>

        {subjectsLoading ? (
          <div className="quiz-subjects-grid" aria-busy="true" aria-label="Loading subjects">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SubjectCardSkeleton key={idx} />
            ))}
          </div>
        ) : subjectsError ? (
          <div className="quiz-loading-state" role="alert">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{subjectsError}</p>
            <button
              type="button"
              className="quiz-back-btn"
              onClick={loadSubjects}
              style={{ marginBottom: 0 }}
            >
              <AppIcon name="refresh" size={18} />
              Try again
            </button>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="quiz-loading-state">
            <p style={{ color: 'var(--text-muted)' }}>No subjects match your search.</p>
          </div>
        ) : (
          <div className="quiz-subjects-grid">
            {filteredSubjects.map((subj, idx) => (
              <motion.button
                key={subj.code}
                type="button"
                className="quiz-subject-card"
                onClick={() => handleSelectSubject(subj)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
              >
                <div className="quiz-subject-code mono-code" translate="no">{subj.code}</div>
                <div className="quiz-subject-name">{subj.name}</div>
                <div className="quiz-subject-meta">
                  <span>{subj.department}</span>
                  <span className="quiz-subject-papers tabular-nums">
                    <AppIcon name="description" size={14} />
                    {subj.papers} Papers
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // CONFIGURE QUIZ
  if (step === 'configure') {
    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="quiz-config-card">
          <button type="button" className="quiz-back-btn" onClick={() => { setSelectedSubject(null); setStep('select'); }}>
            <AppIcon name="arrow_back" size={18} />
            Change Subject
          </button>

          <div className="quiz-selected-subject">
            <div className="quiz-selected-badge">
              <AppIcon name="menu_book" size={16} />
              <span className="mono-code" translate="no">{selectedSubject?.code}</span>
            </div>
            <h2>{selectedSubject?.name}</h2>
          </div>

          {/* Quiz Mode: Practice vs Timed */}
          <div className="quiz-config-field">
            <label className="quiz-config-label">Study Mode</label>
            <div className="quiz-difficulty-grid" role="group" aria-label="Select quiz mode">
              <button
                type="button"
                aria-pressed={quizMode === 'practice'}
                className={`quiz-chip ${quizMode === 'practice' ? 'selected' : ''}`}
                onClick={() => setQuizMode('practice')}
              >
                📖 Practice Mode (Untimed)
              </button>
              <button
                type="button"
                aria-pressed={quizMode === 'timed'}
                className={`quiz-chip ${quizMode === 'timed' ? 'selected' : ''}`}
                onClick={() => setQuizMode('timed')}
              >
                ⏱️ Exam Timer (45s / Q)
              </button>
            </div>
          </div>

          <div className="quiz-config-field">
            <label className="quiz-config-label">Difficulty Level</label>
            <div className="quiz-difficulty-grid" role="group" aria-label="Select difficulty level">
              {DIFFICULTIES.map((d) => (
                <motion.button
                  key={d}
                  type="button"
                  aria-pressed={difficulty === d}
                  className={`quiz-chip ${difficulty === d ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {d === 'Easy' && '🟢 '}
                  {d === 'Medium' && '🟡 '}
                  {d === 'Hard' && '🔴 '}
                  {d}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="quiz-config-field">
            <label className="quiz-config-label">Number of Questions</label>
            <div className="quiz-count-grid" role="group" aria-label="Select number of questions">
              {QUESTION_COUNTS.map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  aria-pressed={numQuestions === n}
                  className={`quiz-count-chip ${numQuestions === n ? 'selected' : ''}`}
                  onClick={() => setNumQuestions(n)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {n} Qs
                </motion.button>
              ))}
            </div>
          </div>

          {error && (
            <div className="quiz-error-alert" role="alert">
              <AppIcon name="error" size={18} />
              {error}
            </div>
          )}

          <motion.button
            type="button"
            className="quiz-generate-btn"
            onClick={handleGenerateQuiz}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <AppIcon name="auto_awesome" size={18} />
            Start {quizMode === 'timed' ? 'Timed Exam' : 'Practice'} Quiz
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // LOADING
  if (step === 'loading') {
    return (
      <div className="quiz-container" aria-busy="true" aria-label="Generating quiz questions">
        <motion.div
          className="quiz-loading-card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="quiz-loading-icon">
            <AppIcon name="auto_awesome" size={44} />
          </div>
          <h2>Generating Your Quiz…</h2>
          <p role="status" aria-live="polite">
            Preparing {numQuestions} {difficulty.toLowerCase()} questions for {selectedSubject?.name}
          </p>
          <div className="quiz-loading-bar">
            <motion.div
              className="quiz-loading-bar-fill"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // PLAYING
  if (step === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;
    const isCorrect = selectedOption === q.correct;
    const isMarked = Boolean(markedForReview[currentIdx]);
    const mins = Math.floor(timeLeftSec / 60);
    const secs = String(timeLeftSec % 60).padStart(2, '0');

    return (
      <motion.div
        className={`quiz-container${quizMode === 'timed' ? ' quiz-container--exam' : ''}`}
        key={currentIdx}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="quiz-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1>{selectedSubject?.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {quizMode === 'timed' && (
              <span
                role="timer"
                aria-label="Time remaining"
                className={`quiz-counter mono-code tabular-nums ${timeLeftSec < 30 ? 'quiz-timer--urgent' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <AppIcon name="timer" size={16} />
                {mins}:{secs}
              </span>
            )}
            <button
              type="button"
              onClick={toggleMarkReview}
              aria-pressed={isMarked}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: isMarked ? 'var(--accent-soft)' : 'var(--surface)',
                color: isMarked ? 'var(--text)' : 'var(--text-subtle)',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                minHeight: '44px',
                cursor: 'pointer'
              }}
            >
              <AppIcon
                name={isMarked ? 'bookmark_flag' : 'flag'}
                size={16}
                filled={isMarked}
                style={{ color: isMarked ? 'var(--accent)' : undefined }}
              />
              {isMarked ? 'Marked for Review' : 'Mark for Review'}
            </button>
            {quizMode === 'timed' && (
              <button
                type="button"
                className="quiz-exit-btn"
                onClick={() => setConfirmExit(true)}
              >
                <AppIcon name="logout" size={16} />
                Exit Exam
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator Pill Bar */}
        <nav aria-label="Question navigator" className="quiz-navigator" ref={navigatorRef}>
          {questions.map((_, idx) => {
            const ans = userAnswers[idx];
            const marked = Boolean(markedForReview[idx]);
            const isCurr = idx === currentIdx;
            const status = marked ? 'flagged' : ans ? (ans.isCorrect ? 'correct' : 'incorrect') : 'unanswered';
            const statusLabel = marked
              ? 'flagged for review'
              : ans
                ? (ans.isCorrect ? 'answered correctly' : 'answered incorrectly')
                : 'unanswered';

            return (
              <button
                key={idx}
                type="button"
                className={`quiz-nav-pill quiz-nav-pill--${status}${isCurr ? ' current' : ''}`}
                onClick={() => handleJumpToQuestion(idx)}
                aria-label={`Question ${idx + 1}: ${statusLabel}`}
                aria-current={isCurr ? 'step' : undefined}
              >
                <span className="quiz-nav-number tabular-nums">{idx + 1}</span>
                {marked ? (
                  <AppIcon name="flag" className="quiz-nav-icon" size={12} />
                ) : ans ? (
                  <AppIcon name={ans.isCorrect ? 'check' : 'close'} className="quiz-nav-icon" size={12} />
                ) : (
                  <span className="quiz-nav-dot" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="quiz-nav-legend" aria-hidden="true">
          <span><AppIcon name="check" className="quiz-nav-icon" size={12} /> Answered</span>
          <span><AppIcon name="flag" className="quiz-nav-icon" size={12} /> Flagged</span>
          <span><span className="quiz-nav-dot" /> Unanswered</span>
        </div>

        <div className="quiz-progress-meta">
          <span className="quiz-counter-text tabular-nums">Question {currentIdx + 1} of {questions.length}</span>
          {streak >= 3 && (
            <span className="quiz-streak-indicator tabular-nums">
              <AppIcon name="local_fire_department" size={16} />
              {streak} streak
            </span>
          )}
          {quizMode === 'timed' && (
            <button type="button" className="quiz-finish-link" onClick={requestFinish}>
              <AppIcon name="task_alt" size={16} />
              Finish Exam
            </button>
          )}
        </div>

        <div className="quiz-progress-bar" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={questions.length}>
          <div
            className="quiz-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="quiz-card" key={currentIdx}>
          <motion.h2
            className="quiz-question"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {q.question}
          </motion.h2>

          <div className="quiz-options">
            {q.options.map((opt, i) => (
              <AnimatedOption
                key={i}
                letter={LETTERS[i]}
                opt={opt}
                index={i}
                selectedOption={selectedOption}
                revealed={revealed}
                correct={q.correct}
                onClick={(idx) => !revealed && setSelectedOption(idx)}
                disabled={revealed}
              />
            ))}
          </div>

          <div className="quiz-keyboard-tip">
            Tip: press 1–4 (or A–D) to select, Enter to submit/continue, ← → to move between questions
          </div>

          {q.hint && !revealed && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="quiz-hint-toggle"
                aria-expanded={showHint}
              >
                <AppIcon name="lightbulb" size={16} />
                {showHint ? 'Hide Hint' : 'Need a Hint?'}
              </button>

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    className="quiz-hint-box"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <strong>Hint:</strong> {q.hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {revealed && (
            <motion.div
              className="quiz-explanation-box"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ flexDirection: 'column', gap: '0.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AppIcon name="info" size={18} />
                  <strong>{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowStepByStep((s) => !s)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--brand)',
                      minHeight: '44px',
                      cursor: 'pointer'
                    }}
                  >
                    {showStepByStep ? 'Hide Step-by-Step' : '✨ Explain Step-by-Step'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplainLang((l) => (l === 'en' ? 'ur' : 'en'))}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      minHeight: '44px',
                      cursor: 'pointer'
                    }}
                  >
                    {explainLang === 'en' ? 'اردو میں دیکھیں' : 'Switch to English'}
                  </button>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.95 }}>
                {q.hint || 'Review the correct option above.'}
              </p>

              {showStepByStep && (
                <div
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.55
                  }}
                  className={explainLang === 'ur' ? 'urdu-explanation' : ''}
                  dir={explainLang === 'ur' ? 'rtl' : 'ltr'}
                >
                  {buildStepByStepExplanation(q, explainLang)}
                </div>
              )}
            </motion.div>
          )}

          <div className="quiz-footer">
            {!revealed ? (
              <motion.button
                type="button"
                className="btn-quiz-next"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                style={{ opacity: selectedOption === null ? 0.5 : 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Submit Answer
                <AppIcon name="check" size={18} />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="btn-quiz-next"
                onClick={handleNextQuestion}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#0f172a' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {currentIdx + 1 === questions.length ? 'View Results' : 'Next Question'}
                <AppIcon name="arrow_forward" size={18} />
              </motion.button>
            )}
          </div>
        </div>

        <Modal isOpen={confirmExit} onClose={() => setConfirmExit(false)} title="Exit this exam?">
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Your answers so far will not be scored or saved. The exam timer keeps running while this dialog is open.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setConfirmExit(false)}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1.1rem',
                borderRadius: '9999px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Keep Going
            </button>
            <button
              type="button"
              onClick={() => { setConfirmExit(false); handleRestart(); }}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1.1rem',
                borderRadius: '9999px',
                border: 'none',
                background: 'var(--danger)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Exit Exam
            </button>
          </div>
        </Modal>

        <Modal isOpen={confirmFinish} onClose={() => setConfirmFinish(false)} title="Submit exam?">
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            You still have{' '}
            <strong style={{ color: 'var(--text)' }}>{unansweredCount} unanswered</strong> and{' '}
            <strong style={{ color: 'var(--text)' }}>{flaggedCount} flagged</strong>{' '}
            {unansweredCount + flaggedCount === 1 ? 'question' : 'questions'}. Unanswered questions count as incorrect.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setConfirmFinish(false);
                const target = questions.findIndex((_, idx) => !userAnswers[idx] || markedForReview[idx]);
                if (target >= 0) handleJumpToQuestion(target);
              }}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1.1rem',
                borderRadius: '9999px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Review Remaining
            </button>
            <button
              type="button"
              onClick={() => { setConfirmFinish(false); finishQuiz(); }}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1.1rem',
                borderRadius: '9999px',
                border: 'none',
                background: 'var(--brand)',
                color: 'var(--on-brand)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Submit Anyway
            </button>
          </div>
        </Modal>
      </motion.div>
    );
  }

  // FINISHED
  if (step === 'finished') {
    const pct = Math.round((score / questions.length) * 100);
    const reviewItems = questions.map((q, idx) => ({
      ...q,
      idx,
      userAns: userAnswers[idx]?.selected,
      revisionCard: quizQuestionToFlashcard(q, selectedSubject?.code),
      status: userAnswers[idx] == null ? 'skipped' : userAnswers[idx].isCorrect ? 'correct' : 'incorrect'
    }));
    const missedCount = reviewItems.filter((item) => item.status !== 'correct').length;

    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3rem 1.75rem' }}>
          <div className="quiz-finish-badge">
            <AppIcon
              name={pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
              size={52}
              style={{ color: pct >= 60 ? 'var(--success)' : 'var(--accent)' }}
            />
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            {pct >= 75 ? 'Outstanding Performance!' : pct >= 50 ? 'Great Job!' : 'Keep Practicing!'}
          </h2>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem', fontSize: '1.0625rem' }}>
            {selectedSubject?.name} (<span className="mono-code" translate="no">{selectedSubject?.code}</span>)
          </p>

          <p className="tabular-nums" style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '1.0625rem' }}>
            You scored <strong style={{ color: 'var(--brand)', fontSize: '1.25rem' }}>{score}/{questions.length}</strong> ({pct}%)
          </p>

          <div className="quiz-stats-row tabular-nums">
            <div className="quiz-stat-item">
              <span className="quiz-stat-value">{questions.length}</span>
              <span className="quiz-stat-label">Questions</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value" style={{ color: 'var(--success)' }}>{score}</span>
              <span className="quiz-stat-label">Correct</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value" style={{ color: 'var(--danger)' }}>{questions.length - score}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </div>
            {elapsedSec != null && (
              <div className="quiz-stat-item">
                <span className="quiz-stat-value">{formatDuration(elapsedSec)}</span>
                <span className="quiz-stat-label">Time Taken</span>
              </div>
            )}
          </div>

          {/* Per-question review with weak-topic detection and missed-question retry */}
          <div
            style={{
              textAlign: 'left',
              marginTop: '2rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase' }}>
                  Answer Review
                </span>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)' }}>
                  {missedCount > 0
                    ? `${missedCount} Missed ${missedCount === 1 ? 'Question' : 'Questions'} to Revisit`
                    : 'Every Question Answered Correctly'}
                </h3>
              </div>
              {missedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryWrongQuestions}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--brand)',
                    color: 'var(--on-brand)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    minHeight: '44px',
                    cursor: 'pointer'
                  }}
                >
                  Retry Missed Questions ({missedCount})
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reviewItems.map((item) => (
                <div
                  key={item.idx}
                  style={{
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span className={`quiz-review-status quiz-review-status--${item.status}`}>
                      <AppIcon
                        name={item.status === 'correct' ? 'check_circle' : item.status === 'incorrect' ? 'cancel' : 'remove_circle'}
                        size={14}
                      />
                      {item.status === 'correct' ? 'Correct' : item.status === 'incorrect' ? 'Incorrect' : 'Skipped'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)' }}>Q{item.idx + 1}</span>
                    <button
                      type="button"
                      className="revision-star-btn"
                      aria-pressed={revisionIds.includes(item.revisionCard.id)}
                      onClick={() => setRevisionIds(toggleRevisionCard(item.revisionCard))}
                    >
                      <AppIcon
                        name={revisionIds.includes(item.revisionCard.id) ? 'star' : 'star_border'}
                        filled={revisionIds.includes(item.revisionCard.id)}
                        size={16}
                      />
                      {revisionIds.includes(item.revisionCard.id) ? 'Saved for Revision' : 'Star for Revision'}
                    </button>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                    {item.question}
                  </p>
                  <p className={item.status === 'correct' ? undefined : 'quiz-review-wrong'} style={{ fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                    Your answer: {item.userAns != null ? `${LETTERS[item.userAns]}. ${item.options[item.userAns]}` : 'Not answered'}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <AppIcon name="check" size={14} style={{ color: 'var(--success)', verticalAlign: 'text-bottom', marginRight: '0.25rem' }} />
                    Correct answer: {LETTERS[item.correct]}. {item.options[item.correct]}
                  </p>
                  {item.hint && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', margin: 0 }}>
                      {item.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleGenerateQuiz}
              style={{ background: 'var(--brand)' }}
            >
              <AppIcon name="refresh" size={18} />
              New Quiz
            </button>

            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleShareResult}
              style={{ background: '#10b981', color: '#0f172a' }}
            >
              <AppIcon name="share" size={18} />
              Share on WhatsApp
            </button>

            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleRestart}
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
            >
              <AppIcon name="menu_book" size={18} />
              Change Subject
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
}