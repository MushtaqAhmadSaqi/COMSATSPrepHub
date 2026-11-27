import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import { recordAiQuizGeneration, recordQuizAttempt, getRevisionDeckIds, toggleRevisionCard, quizQuestionToFlashcard } from '../../utils/studyTracker';
import { fireConfetti } from '../../utils/confetti';
import { useToast } from '../../utils/toast';
import AppIcon from '../../components/ui/AppIcon';
import './TakeAiQuiz.css';
import '../Quiz/Quiz.css';

const LETTERS = ['A', 'B', 'C', 'D'];
const PROGRESS_MESSAGES = [
  'Connecting to AI exam coach…',
  'Drafting COMSATS syllabus-aligned questions…',
  'Validating options and model explanations…'
];

export default function TakeAiQuiz({
  quizParams = { topic: 'Data Structures', subjectCode: 'CSC211', difficulty: 'Medium', numQuestions: 10, questionType: 'mcq' },
  onFinish = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [progressStep, setProgressStep] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [revisionIds, setRevisionIds] = useState(() => getRevisionDeckIds());

  const toast = useToast();
  const prevStreakRef = useRef(0);

  useEffect(() => {
    if (!loading) return undefined;
    const interval = setInterval(() => {
      setProgressStep((s) => (s + 1) % PROGRESS_MESSAGES.length);
    }, 900);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadQuiz() {
      setLoading(true);
      setError(null);
      setQuestions([]);
      setCurrentIdx(0);
      setSelectedOption(null);
      setRevealed(false);
      setScore(0);
      setStreak(0);
      setShowHint(false);
      setIsFinished(false);
      setUserAnswers({});
      prevStreakRef.current = 0;

      try {
        const generated = await generateQuizWithGemini({
          subject: quizParams.topic || 'General Knowledge',
          subjectCode: quizParams.subjectCode || '',
          topic: quizParams.topic || '',
          questionType: quizParams.questionType || 'mcq',
          numQuestions: quizParams.numQuestions || 10,
          difficulty: quizParams.difficulty || 'Medium',
          signal: controller.signal
        });

        if (!cancelled) {
          setQuestions(generated);
          recordAiQuizGeneration({
            subject: quizParams.topic || 'AI Practice Quiz',
            subjectCode: quizParams.subjectCode || '',
            questionCount: generated.length,
            provider:
              generated[0]?.provider ||
              (generated[0]?.isOfflineFallback ? 'Curated Bank' : 'AI')
          });
        }
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setError(err.message || 'Quiz generation failed.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    quizParams.topic,
    quizParams.subjectCode,
    quizParams.difficulty,
    quizParams.numQuestions,
    quizParams.questionType,
    reloadKey
  ]);

  const handleSubmitAnswer = () => {
    if (selectedOption === null || revealed) return;
    setRevealed(true);
    const q = questions[currentIdx];
    const isCorrect = selectedOption === q.correct;
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

  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      const pct = Math.round((score / questions.length) * 100);
      const wrongQuestions = questions.filter((_, idx) => !userAnswers[idx]?.isCorrect);
      recordQuizAttempt({
        subject: quizParams.topic || 'AI Practice Quiz',
        subjectCode: quizParams.subjectCode || '',
        score,
        totalQuestions: questions.length,
        difficulty: quizParams.difficulty || 'Medium',
        wrongTopics: wrongQuestions.map((wq) => wq.question.slice(0, 70))
      });
      if (pct >= 70) {
        fireConfetti({ count: 100, spread: 80, originY: 0.5 });
      }
      setIsFinished(true);
    } else {
      const nextIdx = currentIdx + 1;
      const prevAns = userAnswers[nextIdx];
      setCurrentIdx(nextIdx);
      setSelectedOption(prevAns ? prevAns.selected : null);
      setRevealed(Boolean(prevAns));
      setShowHint(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setRevealed(false);
    setScore(0);
    setStreak(0);
    setShowHint(false);
    setUserAnswers({});
    setIsFinished(false);
  };

  const handleExportQuizJson = () => {
    const exportPayload = {
      title: `${quizParams.topic} (${quizParams.difficulty})`,
      exportedAt: new Date().toISOString(),
      questions
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comsats-ai-quiz-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Quiz exported as JSON!');
  };

  const handleShareWhatsApp = () => {
    const pct = Math.round((score / questions.length) * 100);
    const text = `I scored ${score}/${questions.length} (${pct}%) on an AI-generated "${quizParams.topic}" quiz on COMSATSPrepHub! Try it: ${window.location.origin}/#ai-quiz-generator`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (loading || error || isFinished || questions.length === 0) return;

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
        if (currentIdx + 1 < questions.length) {
          const nextIdx = currentIdx + 1;
          const prevAns = userAnswers[nextIdx];
          setCurrentIdx(nextIdx);
          setSelectedOption(prevAns ? prevAns.selected : null);
          setRevealed(Boolean(prevAns));
          setShowHint(false);
        }
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) {
          const prevIdx = currentIdx - 1;
          const prevAns = userAnswers[prevIdx];
          setCurrentIdx(prevIdx);
          setSelectedOption(prevAns ? prevAns.selected : null);
          setRevealed(Boolean(prevAns));
          setShowHint(false);
        }
      } else if (lowerKey === 'h') {
        if (questions[currentIdx]?.hint && !revealed) {
          e.preventDefault();
          setShowHint((v) => !v);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div className="take-ai-container" aria-busy="true" aria-label="Generating AI practice quiz">
        <div className="quiz-loading-card">
          <div className="quiz-loading-icon">
            <AppIcon name="auto_awesome" size={44} className="ai-quiz-loading-icon" />
          </div>
          <h2>Generating AI Practice Quiz…</h2>
          <p>
            Preparing {quizParams.numQuestions || 10} {quizParams.difficulty || 'Medium'} level questions for{' '}
            <strong>&ldquo;{quizParams.topic || 'General'}&rdquo;</strong>
          </p>
          <p
            className="ai-quiz-progress-status"
            role="status"
            aria-live="polite"
          >
            {PROGRESS_MESSAGES[progressStep]}
          </p>
          <div className="quiz-loading-bar">
            <motion.div
              className="quiz-loading-bar-fill"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="take-ai-container">
        <div className="quiz-card" role="alert">
          <div className="ai-quiz-error-head">
            <AppIcon name="wifi_off" size={22} />
            <h2>Could not generate your quiz</h2>
          </div>
          <p className="ai-quiz-error-copy">
            {error || 'No questions were returned.'} Check your campus Wi-Fi or try a shorter question count.
          </p>

          <div className="ai-quiz-error-actions">
            <button
              type="button"
              className="btn-quiz-next btn-quiz-primary"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <AppIcon name="refresh" size={18} />
              Retry Generation
            </button>

            <button
              type="button"
              className="btn-quiz-next btn-quiz-secondary"
              onClick={onFinish}
            >
              <AppIcon name="arrow_back" size={18} />
              Change Topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        className="take-ai-container"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="quiz-card ai-quiz-summary-card">
          <div className="quiz-finish-badge ai-quiz-finish-badge">
            <AppIcon
              name={pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
              size={52}
              className={pct >= 60 ? 'ai-quiz-finish-icon--pass' : 'ai-quiz-finish-icon--warn'}
            />
          </div>

          <h2 className="ai-quiz-finish-title">
            {pct >= 75 ? 'Awesome Work!' : pct >= 50 ? 'Well Done!' : 'Keep Learning!'}
          </h2>

          <p className="ai-quiz-finish-meta">
            Topic: <strong>{quizParams.topic}</strong> ({quizParams.difficulty})
          </p>

          <p className="ai-quiz-finish-score tabular-nums">
            You scored <strong>{score}/{questions.length}</strong> ({pct}%)
          </p>

          <div className="quiz-stats-row tabular-nums">
            <div className="quiz-stat-item">
              <span className="quiz-stat-value">{questions.length}</span>
              <span className="quiz-stat-label">Total Qs</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value quiz-stat-value--correct">{score}</span>
              <span className="quiz-stat-label">Correct</span>
            </div>
            <div className="quiz-stat-item">
              <span className="quiz-stat-value quiz-stat-value--incorrect">{questions.length - score}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </div>
          </div>

          <section className="quiz-revision-review" aria-label="Answer review and Revision Deck">
            <h3>Review &amp; Save for Revision</h3>
            <p>Star questions to review as flashcards in Study Hub. Saved on this device, including for guests.</p>
            {questions.map((question, index) => {
              const card = quizQuestionToFlashcard(question, quizParams.subjectCode);
              const starred = revisionIds.includes(card.id);
              return (
                <article key={card.id}>
                  <details>
                    <summary>Q{index + 1}. {question.question}</summary>
                    <p>Your answer: {userAnswers[index] ? question.options[userAnswers[index].selected] : 'Not answered'}</p>
                    <p><strong>Correct answer:</strong> {question.options[question.correct]}</p>
                    {question.hint && <p>{question.hint}</p>}
                  </details>
                  <button
                    type="button"
                    className="revision-star-btn"
                    aria-pressed={starred}
                    aria-label={`Star question ${index + 1} for Revision`}
                    onClick={() => setRevisionIds(toggleRevisionCard(card))}
                  >
                    <AppIcon name={starred ? 'star' : 'star_border'} filled={starred} size={18} />
                  </button>
                </article>
              );
            })}
          </section>

          <div className="ai-quiz-finish-actions">
            <button
              type="button"
              className="btn-quiz-next btn-quiz-primary"
              onClick={handleRestartQuiz}
            >
              <AppIcon name="refresh" size={18} />
              Retry Quiz
            </button>

            <button
              type="button"
              className="btn-quiz-next btn-quiz-secondary"
              onClick={handleExportQuizJson}
            >
              <AppIcon name="download" size={18} />
              Export Quiz JSON
            </button>

            <button
              type="button"
              className="btn-quiz-next btn-quiz-whatsapp"
              onClick={handleShareWhatsApp}
            >
              <AppIcon name="share" size={18} />
              Share on WhatsApp
            </button>

            <button
              type="button"
              className="btn-quiz-next btn-quiz-secondary"
              onClick={onFinish}
            >
              <AppIcon name="auto_awesome" size={18} />
              New Topic
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentIdx] || { question: 'Question loading…', options: [], correct: 0, hint: '' };
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const isCorrect = selectedOption === q.correct;

  return (
    <motion.div
      className="take-ai-container"
      key={currentIdx}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="ai-quiz-header">
        <div>
          <div className="ai-quiz-topic-badge">
            <AppIcon name="auto_awesome" size={14} />
            {q.isOfflineFallback ? 'Curated Bank' : 'AI Generated'} · {quizParams.difficulty || 'Medium'}
          </div>
          <h1 className="ai-quiz-topic-name ai-quiz-topic-heading">{quizParams.topic || 'Practice Quiz'}</h1>
        </div>
        <div className="ai-quiz-header-meta">
          <button
            type="button"
            onClick={handleExportQuizJson}
            title="Save / Export Quiz JSON"
            className="ai-quiz-export-pill"
          >
            Export
          </button>
          {streak >= 2 && (
            <span className="ai-quiz-counter ai-quiz-streak tabular-nums">
              <AppIcon name="local_fire_department" size={14} />
              {streak} Streak
            </span>
          )}
          <div className="ai-quiz-counter tabular-nums">
            {currentIdx + 1} / {questions.length}
          </div>
        </div>
      </div>

      <nav aria-label="Question navigator" className="ai-quiz-navigator">
        {questions.map((_, idx) => {
          const ans = userAnswers[idx];
          const isCurr = idx === currentIdx;
          const status = ans ? (ans.isCorrect ? 'correct' : 'incorrect') : 'unanswered';
          const statusLabel = ans
            ? (ans.isCorrect ? 'answered correctly' : 'answered incorrectly')
            : 'unanswered';

          return (
            <button
              key={idx}
              type="button"
              className={`ai-quiz-nav-pill ai-quiz-nav-pill--${status}${isCurr ? ' current' : ''}`}
              aria-label={`Question ${idx + 1}: ${statusLabel}`}
              aria-current={isCurr ? 'step' : undefined}
              onClick={() => {
                const prevAns = userAnswers[idx];
                setCurrentIdx(idx);
                setSelectedOption(prevAns ? prevAns.selected : null);
                setRevealed(Boolean(prevAns));
                setShowHint(false);
              }}
            >
              <span className="tabular-nums">{idx + 1}</span>
            </button>
          );
        })}
      </nav>

      <div className="quiz-progress-bar" role="progressbar" aria-label="Quiz progress" aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={questions.length}>
        <motion.div
          className="quiz-progress-fill ai-quiz-progress-fill"
          initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="quiz-card" key={currentIdx}>
        <h2 className="quiz-question">{q.question}</h2>

        <div className="quiz-options">
          {q.options.map((opt, i) => {
            let optionClass = 'quiz-option-btn';
            if (selectedOption === i) optionClass += ' selected';
            if (revealed) {
              if (i === q.correct) optionClass += ' correct';
              else if (selectedOption === i) optionClass += ' incorrect';
            }

            return (
              <button
                key={i}
                type="button"
                className={optionClass}
                aria-pressed={selectedOption === i}
                onClick={() => !revealed && setSelectedOption(i)}
                disabled={revealed}
              >
                <span className="quiz-option-letter">{LETTERS[i]}</span>
                <span className="ai-quiz-opt-label">{opt}</span>
                {revealed && i === q.correct && (
                  <AppIcon name="check_circle" size={20} className="ai-quiz-opt-icon--correct" />
                )}
                {revealed && selectedOption === i && i !== q.correct && (
                  <AppIcon name="cancel" size={20} className="ai-quiz-opt-icon--incorrect" />
                )}
              </button>
            );
          })}
        </div>

        <div className="quiz-keyboard-tip">
          Tip: press 1-4 (or A-D) to select, Enter to confirm/continue
        </div>

        {q.hint && !revealed && (
          <div className="ai-quiz-hint-wrap">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              aria-expanded={showHint}
              className="quiz-hint-toggle"
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

        {revealed && q.hint && (
          <motion.div
            className="quiz-explanation-box"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AppIcon name="info" size={18} />
            <div>
              <strong>{isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}</strong>
              <p className="ai-quiz-explanation-text">
                {q.hint}
              </p>
            </div>
          </motion.div>
        )}

        <div className="quiz-footer">
          {!revealed ? (
            <button
              type="button"
              className="btn-quiz-next btn-quiz-submit"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
            >
              Submit Answer
              <AppIcon name="check" size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-quiz-next btn-quiz-finish-next"
              onClick={handleNextQuestion}
            >
              {currentIdx + 1 === questions.length ? 'View Final Score' : 'Next Question'}
              <AppIcon name="arrow_forward" size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
