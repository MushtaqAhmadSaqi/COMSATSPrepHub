import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuizWithGemini } from '../../services/geminiService';
import { fireConfetti } from '../../utils/confetti';
import './TakeAiQuiz.css';
import '../Quiz/Quiz.css';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TakeAiQuiz({
  quizParams = { topic: 'Data Structures', difficulty: 'Medium', numQuestions: 10 },
  onFinish = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const prevStreakRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchAiQuiz() {
      setLoading(true);
      try {
        const generated = await generateQuizWithGemini({
          subject: quizParams.topic || 'General Knowledge',
          numQuestions: quizParams.numQuestions || 10,
          difficulty: quizParams.difficulty || 'Medium',
        });
        if (isMounted) {
          setQuestions(generated);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load AI quiz:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchAiQuiz();
    return () => { isMounted = false; };
  }, [quizParams.topic, quizParams.difficulty, quizParams.numQuestions]);

  const handleSubmitAnswer = () => {
    if (selectedOption === null || revealed) return;
    setRevealed(true);
    const q = questions[currentIdx];
    const isCorrect = selectedOption === q.correct;

    if (isCorrect) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      if (newStreak >= 3 && prevStreakRef.current < 3) {
        fireConfetti({ count: 40, spread: 50 });
      }
      prevStreakRef.current = newStreak;
    } else {
      setStreak(0);
      prevStreakRef.current = 0;
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      const pct = Math.round(((score + (selectedOption === questions[currentIdx]?.correct ? 0 : 0)) / questions.length) * 100);
      if (pct >= 50) {
        fireConfetti({ count: 100, spread: 80, originY: 0.5 });
      }
      setIsFinished(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setRevealed(false);
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
    setIsFinished(false);
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="take-ai-container">
        <motion.div
          className="quiz-loading-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="quiz-loading-icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#0ea5e9' }}>
              auto_awesome
            </span>
          </motion.div>
          <h2>Generating AI Practice Quiz...</h2>
          <p>
            Preparing {quizParams.numQuestions || 10} {quizParams.difficulty || 'Medium'} level questions for <strong>"{quizParams.topic || 'General'}"</strong>
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

  // FINISHED STATE
  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        className="take-ai-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <motion.div
            className="quiz-finish-badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: pct >= 60 ? '#10b981' : '#f59e0b' }}>
              {pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
            </span>
          </motion.div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem' }}>
            {pct >= 75 ? 'Awesome Work! 🎉' : pct >= 50 ? 'Well Done! 👍' : 'Keep Learning! 💪'}
          </h2>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem', fontSize: '1.0625rem' }}>
            Topic: <strong>{quizParams.topic}</strong> ({quizParams.difficulty})
          </p>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '1.0625rem' }}>
            You scored <strong style={{ color: 'var(--brand)', fontSize: '1.25rem' }}>{score}/{questions.length}</strong> ({pct}%)
          </p>

          <div className="quiz-stats-row">
            <div className="quiz-stat-item">
              <span className="quiz-stat-value">{questions.length}</span>
              <span className="quiz-stat-label">Total Qs</span>
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem' }}>
            <motion.button
              type="button"
              className="btn-quiz-next"
              onClick={handleRestartQuiz}
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0d9488)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry Quiz
            </motion.button>

            <motion.button
              type="button"
              className="btn-quiz-next"
              onClick={onFinish}
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              New Topic
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // PLAYING STATE
  const q = questions[currentIdx] || { question: 'Question loading...', options: [], correct: 0, hint: '' };
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const isCorrect = selectedOption === q.correct;

  return (
    <motion.div
      className="take-ai-container"
      key={currentIdx}
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Banner */}
      <div className="ai-quiz-header">
        <div>
          <div className="ai-quiz-topic-badge">
            ✨ AI Generated · {quizParams.difficulty || 'Medium'}
          </div>
          <div className="ai-quiz-topic-name">{quizParams.topic || 'Practice Quiz'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {streak >= 2 && (
            <span className="quiz-streak-badge" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
              🔥 {streak} Streak!
            </span>
          )}
          <div className="ai-quiz-counter">
            {currentIdx + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress-bar">
        <motion.div
          className="quiz-progress-fill"
          style={{ background: 'linear-gradient(90deg, #0ea5e9, #0d9488)' }}
          initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Question Card */}
      <div className="quiz-card" key={currentIdx}>
        <h3 className="quiz-question">{q.question}</h3>

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
                onClick={() => !revealed && setSelectedOption(i)}
                disabled={revealed}
              >
                <span className="quiz-option-letter">{LETTERS[i]}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {revealed && i === q.correct && (
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>
                    check_circle
                  </span>
                )}
                {revealed && selectedOption === i && i !== q.correct && (
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>
                    cancel
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hint toggle */}
        {q.hint && !revealed && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="quiz-hint-toggle"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
              {showHint ? 'Hide Hint' : 'Need a Hint?'}
            </button>

            <AnimatePresence>
              {showHint && (
                <motion.div
                  className="quiz-hint-box"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  💡 <strong>Hint:</strong> {q.hint}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Answer Explanation */}
        {revealed && q.hint && (
          <motion.div
            className="quiz-explanation-box"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
            <div>
              <strong>{isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Answer'}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                {q.hint}
              </p>
            </div>
          </motion.div>
        )}

        <div className="quiz-footer">
          {!revealed ? (
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0d9488)',
                opacity: selectedOption === null ? 0.5 : 1
              }}
            >
              Submit Answer
              <span className="material-symbols-outlined">check</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleNextQuestion}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {currentIdx + 1 === questions.length ? 'View Final Score' : 'Next Question'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
