import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import { recordQuizAttempt, getStudentPrefs } from '../../utils/studyTracker';
import { fireConfetti } from '../../utils/confetti';
import { useToast } from '../../utils/toast';
import { SubjectCardSkeleton } from '../../components/ui/Skeleton';
import PageHeader from '../../components/PageHeader/PageHeader';
import './Quiz.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const LETTERS = ['A', 'B', 'C', 'D'];

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
      <span className="quiz-option-letter">{letter}</span>
      <span style={{ flex: 1 }}>{opt}</span>
      {revealed && index === correct && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="material-symbols-outlined"
          style={{ fontSize: '20px', color: '#10b981' }}
          aria-hidden="true"
        >
          check_circle
        </motion.span>
      )}
      {revealed && selectedOption === index && index !== correct && (
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }} aria-hidden="true">
          cancel
        </span>
      )}
    </motion.button>
  );
}

export default function Quiz() {
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
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [explainLang, setExplainLang] = useState(() => getStudentPrefs().lang || 'en');
  const [markedForReview, setMarkedForReview] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [error, setError] = useState('');

  const toast = useToast();
  const prevStreakRef = useRef(0);

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
  useEffect(() => {
    if (step !== 'playing' || quizMode !== 'timed' || timeLeftSec <= 0) return undefined;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStep('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, quizMode, timeLeftSec]);

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
    setScore(0);
    setStreak(0);
    setShowHint(false);
    setShowStepByStep(false);
    setMarkedForReview({});
    setUserAnswers({});
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
    if (selectedOption === null) return;
    setRevealed(true);
    const isCorrect = selectedOption === questions[currentIdx].correct;
    setUserAnswers((prev) => ({
      ...prev,
      [currentIdx]: { selected: selectedOption, isCorrect }
    }));
    if (isCorrect) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      prevStreakRef.current = newStreak;
    } else {
      setStreak(0);
      prevStreakRef.current = 0;
    }
  };

  const finishQuiz = () => {
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

  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      finishQuiz();
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setRevealed(false);
      setShowHint(false);
      setShowStepByStep(false);
    }
  };

  const handleJumpToQuestion = (idx) => {
    setCurrentIdx(idx);
    const prevAns = userAnswers[idx];
    if (prevAns) {
      setSelectedOption(prevAns.selected);
      setRevealed(true);
    } else {
      setSelectedOption(null);
      setRevealed(false);
    }
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
    setScore(0);
    setStreak(0);
    setShowHint(false);
    setError('');
  };

  useEffect(() => {
    if (step !== 'playing' || questions.length === 0) return;

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) return;

      const key = e.key;
      if (['1', '2', '3', '4'].includes(key)) {
        const optionIdx = parseInt(key, 10) - 1;
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
            className="quiz-search-input"
            placeholder="Search by name or code (e.g. CSC211)..."
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
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">refresh</span>
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
                <div className="quiz-subject-code">{subj.code}</div>
                <div className="quiz-subject-name">{subj.name}</div>
                <div className="quiz-subject-meta">
                  <span>{subj.department}</span>
                  <span className="quiz-subject-papers">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">description</span>
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
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            Change Subject
          </button>

          <div className="quiz-selected-subject">
            <div className="quiz-selected-badge">
              <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              {selectedSubject?.code}
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
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
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
            <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
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
          <motion.div
            className="quiz-loading-icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }} aria-hidden="true">
              auto_awesome
            </span>
          </motion.div>
          <h2>Generating Your Quiz...</h2>
          <p>Preparing {numQuestions} {difficulty.toLowerCase()} questions for {selectedSubject?.name}</p>
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
        className="quiz-container"
        key={currentIdx}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="quiz-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1>{selectedSubject?.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {quizMode === 'timed' && (
              <span
                role="timer"
                aria-label="Time remaining"
                className="quiz-counter"
                style={{
                  color: timeLeftSec < 30 ? 'var(--danger)' : 'var(--brand)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">timer</span>
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
                color: isMarked ? 'var(--accent)' : 'var(--text-subtle)',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                minHeight: '38px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">
                {isMarked ? 'bookmark_flag' : 'flag'}
              </span>
              {isMarked ? 'Marked for Review' : 'Mark for Review'}
            </button>
          </div>
        </div>

        {/* Question Navigator Pill Bar */}
        <nav
          aria-label="Question navigator"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            marginBottom: '1rem'
          }}
        >
          {questions.map((_, idx) => {
            const ans = userAnswers[idx];
            const marked = markedForReview[idx];
            const isCurr = idx === currentIdx;
            let bg = 'var(--surface)';
            let color = 'var(--text-subtle)';
            if (isCurr) {
              bg = 'var(--brand)';
              color = '#ffffff';
            } else if (marked) {
              bg = 'var(--accent-soft)';
              color = 'var(--accent)';
            } else if (ans) {
              bg = ans.isCorrect ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)';
              color = ans.isCorrect ? '#059669' : '#dc2626';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleJumpToQuestion(idx)}
                aria-label={`Go to Question ${idx + 1}${marked ? ' (marked for review)' : ''}`}
                aria-current={isCurr ? 'step' : undefined}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: `1.5px solid ${isCurr ? 'var(--brand)' : 'var(--border)'}`,
                  background: bg,
                  color,
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </nav>

        <div className="quiz-progress-meta">
          <span className="quiz-counter-text">Question {currentIdx + 1} of {questions.length}</span>
          {streak >= 3 && (
            <span className="quiz-streak-indicator">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }} aria-hidden="true">
                local_fire_department
              </span>
              {streak} streak
            </span>
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
            Tip: press 1–4 to answer, Enter to continue
          </div>

          {q.hint && !revealed && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="quiz-hint-toggle"
                aria-expanded={showHint}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">lightbulb</span>
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
                    💡 <strong>Hint:</strong> {q.hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {revealed && (
            <motion.div
              className="quiz-explanation-box"
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ flexDirection: 'column', gap: '0.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">info</span>
                  <strong>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowStepByStep((s) => !s)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--brand)'
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
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text)'
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
                <span className="material-symbols-outlined" aria-hidden="true">check</span>
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="btn-quiz-next"
                onClick={handleNextQuestion}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {currentIdx + 1 === questions.length ? 'View Results' : 'Next Question'}
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // FINISHED
  if (step === 'finished') {
    const pct = Math.round((score / questions.length) * 100);
    const wrongItems = questions
      .map((q, idx) => ({ ...q, idx, userAns: userAnswers[idx]?.selected }))
      .filter((item) => item.userAns !== item.correct);

    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3rem 1.75rem' }}>
          <motion.div
            className="quiz-finish-badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: pct >= 60 ? '#10b981' : '#f59e0b' }} aria-hidden="true">
              {pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
            </span>
          </motion.div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            {pct >= 75 ? 'Outstanding Performance! 🎉' : pct >= 50 ? 'Great Job! 👍' : 'Keep Practicing! 💪'}
          </h2>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem', fontSize: '1.0625rem' }}>
            {selectedSubject?.name} ({selectedSubject?.code})
          </p>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '1.0625rem' }}>
            You scored <strong style={{ color: 'var(--brand)', fontSize: '1.25rem' }}>{score}/{questions.length}</strong> ({pct}%)
          </p>

          <div className="quiz-stats-row">
            <div className="quiz-stat-item">
              <span className="quiz-stat-value">{questions.length}</span>
              <span className="quiz-stat-label">Questions</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value" style={{ color: '#10b981' }}>{score}</span>
              <span className="quiz-stat-label">Correct</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value" style={{ color: '#ef4444' }}>{questions.length - score}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </div>
          </div>

          {/* Weak-Topic Detection & Review Wrong Answers */}
          {wrongItems.length > 0 && (
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
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase' }}>
                    🎯 Weak-Topic Detection &amp; Answer Review
                  </span>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)' }}>
                    Review {wrongItems.length} Missed {wrongItems.length === 1 ? 'Question' : 'Questions'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleRetryWrongQuestions}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--brand)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    minHeight: '40px'
                  }}
                >
                  Retry Wrong Questions Only ({wrongItems.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {wrongItems.map((item) => (
                  <div
                    key={item.idx}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                      Q{item.idx + 1}. {item.question}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginBottom: '0.2rem' }}>
                      Your answer: {item.userAns != null ? `${LETTERS[item.userAns]}. ${item.options[item.userAns]}` : 'Not answered'}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Correct answer: {LETTERS[item.correct]}. {item.options[item.correct]}
                    </p>
                    {item.hint && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', margin: 0 }}>
                        💡 {item.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleGenerateQuiz}
              style={{ background: 'var(--brand)' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              New Quiz
            </button>

            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleShareResult}
              style={{ background: '#10b981' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">share</span>
              Share on WhatsApp
            </button>

            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleRestart}
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              Change Subject
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
}