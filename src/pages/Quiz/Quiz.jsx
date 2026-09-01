import React, { useState, useEffect } from 'react';
import { fireConfetti } from '../../utils/confetti';
import './Quiz.css';

const QUESTIONS = [
  {
    question: 'What is the time complexity of searching in a balanced Binary Search Tree?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correct: 2,
    hint: 'Think about halving the search space at each tree level.'
  },
  {
    question: 'Which data structure follows the FIFO (First In, First Out) principle?',
    options: ['Stack', 'Queue', 'Array', 'Tree'],
    correct: 1,
    hint: 'Like a line of people waiting at a ticketing counter.'
  },
  {
    question: 'What does OOP stand for?',
    options: ['Object-Oriented Programming', 'Open-Output Process', 'Ordered Object Protocol', 'None of these'],
    correct: 0,
    hint: 'Focuses on Objects and Classes rather than actions and logic.'
  },
  {
    question: 'Which sorting algorithm has the best average-case time complexity?',
    options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],
    correct: 2,
    hint: 'A divide-and-conquer algorithm that operates in O(n log n).'
  }
];

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Quiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);

  const q = QUESTIONS[currentIdx];
  const progress = ((currentIdx) / QUESTIONS.length) * 100;

  const handleNext = () => {
    const isCorrect = selectedOption === q.correct;
    const newScore = isCorrect ? score + 1 : score;
    const newStreak = isCorrect ? streak + 1 : 0;

    if (isCorrect && newStreak >= 2) {
      fireConfetti({ count: 35, spread: 50 });
    }

    if (currentIdx + 1 >= QUESTIONS.length) {
      setScore(newScore);
      setStreak(newStreak);
      setFinished(true);
      if (newScore / QUESTIONS.length >= 0.5) {
        fireConfetti({ count: 120, spread: 90, originY: 0.5 });
      }
    } else {
      setScore(newScore);
      setStreak(newStreak);
      setSelectedOption(null);
      setShowHint(false);
      setCurrentIdx((prev) => prev + 1);
    }
  };

  if (finished) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
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

          <p style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '1.0625rem' }}>
            You scored <strong style={{ color: 'var(--brand)', fontSize: '1.25rem' }}>{score}/{QUESTIONS.length}</strong> ({pct}%)
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-quiz-next"
              onClick={() => {
                setCurrentIdx(0);
                setSelectedOption(null);
                setScore(0);
                setStreak(0);
                setShowHint(false);
                setFinished(false);
              }}
            >
              <span className="material-symbols-outlined">refresh</span>
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      {/* Top Bar */}
      <div className="quiz-header">
        <div>
          <h1>Practice Quiz</h1>
          {streak > 1 && (
            <span className="quiz-streak-badge">
              🔥 {streak} Answer Streak!
            </span>
          )}
        </div>
        <span className="quiz-counter">
          Question {currentIdx + 1} of {QUESTIONS.length}
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
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`quiz-option-btn ${selectedOption === i ? 'selected' : ''}`}
              onClick={() => setSelectedOption(i)}
            >
              <span className="quiz-option-letter">{LETTERS[i]}</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {selectedOption === i && (
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--brand)' }}>
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Hint toggle */}
        {q.hint && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
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

        {/* Footer */}
        <div className="quiz-footer">
          <button
            type="button"
            className="btn-quiz-next"
            onClick={handleNext}
            disabled={selectedOption === null}
            style={{ opacity: selectedOption === null ? 0.5 : 1 }}
          >
            {currentIdx + 1 === QUESTIONS.length ? 'Submit Quiz' : 'Next Question'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
