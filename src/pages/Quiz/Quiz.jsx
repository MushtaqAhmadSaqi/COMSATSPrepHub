import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { generateQuizWithGemini } from '../../services/geminiService';
import { fireConfetti } from '../../utils/confetti';
import './Quiz.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const LETTERS = ['A', 'B', 'C', 'D'];

/* ── Animated Option Button ── */
function AnimatedOption({ letter, opt, index, selectedOption, revealed, correct, isCorrect, onClick, disabled }) {
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={!revealed ? { scale: 1.01, x: 2 } : {}}
      whileTap={{ scale: 0.98 }}
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
        >
          check_circle
        </motion.span>
      )}
      {revealed && selectedOption === index && index !== correct && (
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>
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
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState('');

  const prevStreakRef = useRef(0);

  useEffect(() => {
    async function loadSubjects() {
      setSubjectsLoading(true);
      const data = await fetchSubjectsFromSupabase();
      if (data && data.length > 0) { setSubjects(data); }
      else {
        setSubjects([
          { code: 'CSC211', name: 'Data Structures & Algorithms', papers: 19, department: 'CS & IT' },
          { code: 'CSC102', name: 'Programming Fundamentals', papers: 22, department: 'CS & IT' },
          { code: 'CSC241', name: 'Object Oriented Programming', papers: 18, department: 'CS & IT' },
          { code: 'CSC371', name: 'Database Systems', papers: 15, department: 'CS & IT' },
          { code: 'CSC311', name: 'Computer Networks', papers: 13, department: 'CS & IT' },
          { code: 'MTH104', name: 'Calculus & Analytical Geometry', papers: 16, department: 'Math' },
        ]);
      }
      setSubjectsLoading(false);
    }
    loadSubjects();
  }, []);

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setStep('configure');
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
        difficulty,
      });
      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setSelectedOption(null);
      setRevealed(false);
      setScore(0);
      setStreak(0);
      setShowHint(false);
      setStep('playing');
    } catch (err) {
      setError(err.message || 'Failed to generate quiz. Please try again.');
      setStep('configure');
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setRevealed(true);
    const isCorrect = selectedOption === questions[currentIdx].correct;
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
      const finalScore = score;
      const pct = Math.round((finalScore / questions.length) * 100);
      if (pct >= 50) { fireConfetti({ count: 100, spread: 80, originY: 0.5 }); }
      setStep('finished');
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setRevealed(false);
      setShowHint(false);
    }
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

  // SELECT SUBJECT
  if (step === 'select') {
    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="quiz-select-header">
          <h1>Practice Quiz</h1>
          <p>Choose a subject to generate an AI-powered practice quiz</p>
        </div>

        <div className="quiz-search-wrapper">
          <input
            type="text"
            className="quiz-search-input"
            placeholder="🔍 Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {subjectsLoading ? (
          <motion.div className="quiz-loading-state" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
              progress_activity
            </span>
            <p>Loading subjects...</p>
          </motion.div>
        ) : (
          <div className="quiz-subjects-grid">
            {filteredSubjects.map((subj, idx) => (
              <motion.button
                key={subj.code}
                type="button"
                className="quiz-subject-card"
                style={{ animationDelay: `${idx * 0.04}s` }}
                onClick={() => handleSelectSubject(subj)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(14,165,233,0.15)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="quiz-subject-code">{subj.code}</div>
                <div className="quiz-subject-name">{subj.name}</div>
                <div className="quiz-subject-meta">
                  <span>{subj.department}</span>
                  <span className="quiz-subject-papers">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
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
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="quiz-config-card">
          <button type="button" className="quiz-back-btn" onClick={() => { setSelectedSubject(null); setStep('select'); }}>
            <span className="material-symbols-outlined">arrow_back</span>
            Change Subject
          </button>

          <div className="quiz-selected-subject">
            <div className="quiz-selected-badge">
              <span className="material-symbols-outlined">menu_book</span>
              {selectedSubject?.code}
            </div>
            <h2>{selectedSubject?.name}</h2>
          </div>

          <div className="quiz-config-field">
            <label className="quiz-config-label">Difficulty Level</label>
            <div className="quiz-difficulty-grid">
              {DIFFICULTIES.map((d) => (
                <motion.button
                  key={d}
                  type="button"
                  className={`quiz-chip ${difficulty === d ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
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
            <div className="quiz-count-grid">
              {QUESTION_COUNTS.map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  className={`quiz-count-chip ${numQuestions === n ? 'selected' : ''}`}
                  onClick={() => setNumQuestions(n)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {n} Qs
                </motion.button>
              ))}
            </div>
          </div>

          {error && (
            <div className="quiz-error-alert">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <motion.button
            type="button"
            className="quiz-generate-btn"
            onClick={handleGenerateQuiz}
            whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(14,165,233,0.35)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Generate AI Quiz
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // LOADING
  if (step === 'loading') {
    return (
      <div className="quiz-container">
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
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>
              auto_awesome
            </span>
          </motion.div>
          <h2>Generating Your Quiz...</h2>
          <p>AI is creating {numQuestions} {difficulty.toLowerCase()} questions for {selectedSubject?.name}</p>
          <div className="quiz-loading-bar">
            <motion.div
              className="quiz-loading-bar-fill"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
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

    return (
      <motion.div
        className="quiz-container"
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="quiz-header">
          <div>
            <h1>{selectedSubject?.name}</h1>
            {streak >= 2 && (
              <motion.span
                className="quiz-streak-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                🔥 {streak} Answer Streak!
              </motion.span>
            )}
          </div>
          <span className="quiz-counter">Question {currentIdx + 1} of {questions.length}</span>
        </div>

        <div className="quiz-progress-bar">
          <motion.div
            className="quiz-progress-fill"
            initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        <div className="quiz-card" key={currentIdx}>
          <motion.h3
            className="quiz-question"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {q.question}
          </motion.h3>

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
                isCorrect={isCorrect}
                onClick={(idx) => !revealed && setSelectedOption(idx)}
                disabled={revealed}
              />
            ))}
          </div>

          {q.hint && !revealed && (
            <div style={{ marginBottom: '1.5rem' }}>
              <motion.button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="quiz-hint-toggle"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
                {showHint ? 'Hide Hint' : 'Need a Hint?'}
              </motion.button>

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    className="quiz-hint-box"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    💡 <strong>Hint:</strong> {q.hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {revealed && q.hint && (
            <motion.div
              className="quiz-explanation-box"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              <div>
                <strong>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {q.hint}
                </p>
              </div>
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
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Submit Answer
                <span className="material-symbols-outlined">check</span>
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="btn-quiz-next"
                onClick={handleNextQuestion}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentIdx + 1 === questions.length ? 'View Results' : 'Next Question'}
                <span className="material-symbols-outlined">arrow_forward</span>
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
    return (
      <motion.div
        className="quiz-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
      >
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <motion.div
            className="quiz-finish-badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: pct >= 60 ? '#10b981' : '#f59e0b' }}>
              {pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}
          >
            {pct >= 75 ? 'Outstanding Performance! 🎉' : pct >= 50 ? 'Great Job! 👍' : 'Keep Practicing! 💪'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem', fontSize: '1.0625rem' }}
          >
            {selectedSubject?.name}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '1.0625rem' }}
          >
            You scored <strong style={{ color: 'var(--brand)', fontSize: '1.25rem' }}>{score}/{questions.length}</strong> ({pct}%)
          </motion.p>

          <div className="quiz-stats-row">
            <motion.div className="quiz-stat-item" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }}>
              <span className="quiz-stat-value">{questions.length}</span>
              <span className="quiz-stat-label">Questions</span>
            </motion.div>
            <motion.div className="quiz-stat-item" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }}>
              <span className="quiz-stat-value" style={{ color: '#10b981' }}>{score}</span>
              <span className="quiz-stat-label">Correct</span>
            </motion.div>
            <motion.div className="quiz-stat-item" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }}>
              <span className="quiz-stat-value" style={{ color: '#ef4444' }}>{questions.length - score}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </motion.div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <motion.button
              type="button"
              className="btn-quiz-next"
              onClick={handleGenerateQuiz}
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">refresh</span>
              New Quiz
            </motion.button>
            <motion.button
              type="button"
              className="btn-quiz-next"
              onClick={handleRestart}
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">menu_book</span>
              Change Subject
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
}