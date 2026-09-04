import React, { useState, useEffect, useRef } from 'react';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { generateQuizWithGemini } from '../../services/geminiService';
import { fireConfetti } from '../../utils/confetti';
import './Quiz.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function Quiz() {
  // Step state: 'select' | 'configure' | 'loading' | 'playing' | 'finished'
  const [step, setStep] = useState('select');

  // Subject selection
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quiz configuration
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState('');

  // Ref for streak confetti
  const prevStreakRef = useRef(0);

  // Fetch subjects on mount
  useEffect(() => {
    async function loadSubjects() {
      setSubjectsLoading(true);
      const data = await fetchSubjectsFromSupabase();
      if (data && data.length > 0) {
        setSubjects(data);
      } else {
        // Fallback subjects
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

  // Filter subjects by search
  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle subject selection
  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setStep('configure');
  };

  // Handle quiz generation
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
      console.error('Failed to generate quiz:', err);
      setError(err.message || 'Failed to generate quiz. Please try again.');
      setStep('configure');
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    setRevealed(true);

    const isCorrect = selectedOption === questions[currentIdx].correct;
    if (isCorrect) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);

      // Fire confetti on streak of 3+
      if (newStreak >= 3 && prevStreakRef.current < 3) {
        fireConfetti({ count: 40, spread: 50 });
      }
      prevStreakRef.current = newStreak;
    } else {
      setStreak(0);
      prevStreakRef.current = 0;
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      // Quiz finished
      const finalScore = score;
      const pct = Math.round((finalScore / questions.length) * 100);
      if (pct >= 50) {
        fireConfetti({ count: 100, spread: 80, originY: 0.5 });
      }
      setStep('finished');
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setRevealed(false);
      setShowHint(false);
    }
  };

  // Handle restart
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

  // === RENDER STEP: SELECT SUBJECT ===
  if (step === 'select') {
    return (
      <div className="quiz-container">
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
          <div className="quiz-loading-state">
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
              progress_activity
            </span>
            <p>Loading subjects...</p>
          </div>
        ) : (
          <div className="quiz-subjects-grid">
            {filteredSubjects.map((subj, idx) => (
              <button
                key={subj.code}
                type="button"
                className="quiz-subject-card"
                style={{ animationDelay: `${idx * 0.04}s` }}
                onClick={() => handleSelectSubject(subj)}
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
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === RENDER STEP: CONFIGURE QUIZ ===
  if (step === 'configure') {
    return (
      <div className="quiz-container">
        <div className="quiz-config-card">
          {/* Back button */}
          <button
            type="button"
            className="quiz-back-btn"
            onClick={() => {
              setSelectedSubject(null);
              setStep('select');
            }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Change Subject
          </button>

          {/* Selected subject badge */}
          <div className="quiz-selected-subject">
            <div className="quiz-selected-badge">
              <span className="material-symbols-outlined">menu_book</span>
              {selectedSubject?.code}
            </div>
            <h2>{selectedSubject?.name}</h2>
          </div>

          {/* Difficulty */}
          <div className="quiz-config-field">
            <label className="quiz-config-label">Difficulty Level</label>
            <div className="quiz-difficulty-grid">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`quiz-chip ${difficulty === d ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'Easy' && '🟢 '}
                  {d === 'Medium' && '🟡 '}
                  {d === 'Hard' && '🔴 '}
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Questions */}
          <div className="quiz-config-field">
            <label className="quiz-config-label">Number of Questions</label>
            <div className="quiz-count-grid">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`quiz-count-chip ${numQuestions === n ? 'selected' : ''}`}
                  onClick={() => setNumQuestions(n)}
                >
                  {n} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="quiz-error-alert">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            className="quiz-generate-btn"
            onClick={handleGenerateQuiz}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Generate AI Quiz
          </button>
        </div>
      </div>
    );
  }

  // === RENDER STEP: LOADING ===
  if (step === 'loading') {
    return (
      <div className="quiz-container">
        <div className="quiz-loading-card">
          <div className="quiz-loading-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>
              auto_awesome
            </span>
          </div>
          <h2>Generating Your Quiz...</h2>
          <p>AI is creating {numQuestions} {difficulty.toLowerCase()} questions for {selectedSubject?.name}</p>
          <div className="quiz-loading-bar">
            <div className="quiz-loading-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  // === RENDER STEP: PLAYING ===
  if (step === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = ((currentIdx) / questions.length) * 100;
    const isCorrect = selectedOption === q.correct;

    return (
      <div className="quiz-container">
        {/* Top Bar */}
        <div className="quiz-header">
          <div>
            <h1>{selectedSubject?.name}</h1>
            {streak >= 2 && (
              <span className="quiz-streak-badge">
                🔥 {streak} Answer Streak!
              </span>
            )}
          </div>
          <span className="quiz-counter">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Question Card */}
        <div className="quiz-card" key={currentIdx}>
          <h3 className="quiz-question">{q.question}</h3>

          {/* Options */}
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
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10b981' }}>
                      check_circle
                    </span>
                  )}
                  {revealed && selectedOption === i && i !== q.correct && (
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>
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

              {showHint && (
                <div className="quiz-hint-box">
                  💡 <strong>Hint:</strong> {q.hint}
                </div>
              )}
            </div>
          )}

          {/* Explanation after reveal */}
          {revealed && q.hint && (
            <div className="quiz-explanation-box">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              <div>
                <strong>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {q.hint}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="quiz-footer">
            {!revealed ? (
              <button
                type="button"
                className="btn-quiz-next"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                style={{ opacity: selectedOption === null ? 0.5 : 1 }}
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
                {currentIdx + 1 === questions.length ? 'View Results' : 'Next Question'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === RENDER STEP: FINISHED ===
  if (step === 'finished') {
    const pct = Math.round((score / questions.length) * 100);

    return (
      <div className="quiz-container">
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div className="quiz-finish-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: pct >= 60 ? '#10b981' : '#f59e0b' }}>
              {pct >= 75 ? 'military_tech' : pct >= 50 ? 'emoji_events' : 'school'}
            </span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            {pct >= 75 ? 'Outstanding Performance! 🎉' : pct >= 50 ? 'Great Job! 👍' : 'Keep Practicing! 💪'}
          </h2>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem', fontSize: '1.0625rem' }}>
            {selectedSubject?.name}
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleGenerateQuiz}
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
            >
              <span className="material-symbols-outlined">refresh</span>
              New Quiz
            </button>
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleRestart}
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
            >
              <span className="material-symbols-outlined">menu_book</span>
              Change Subject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
