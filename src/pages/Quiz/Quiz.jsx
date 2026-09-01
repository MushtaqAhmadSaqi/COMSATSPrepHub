import React, { useState } from 'react';
import './Quiz.css';

const QUESTIONS = [
  {
    question: 'What is the time complexity of searching in a balanced Binary Search Tree?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correct: 2
  },
  {
    question: 'Which data structure follows the FIFO (First In, First Out) principle?',
    options: ['Stack', 'Queue', 'Array', 'Tree'],
    correct: 1
  },
  {
    question: 'What does OOP stand for?',
    options: ['Object-Oriented Programming', 'Open-Output Process', 'Ordered Object Protocol', 'None of these'],
    correct: 0
  },
  {
    question: 'Which sorting algorithm has the best average-case time complexity?',
    options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],
    correct: 2
  }
];

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Quiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUESTIONS[currentIdx];
  const progress = ((currentIdx) / QUESTIONS.length) * 100;

  const handleNext = () => {
    const isCorrect = selectedOption === q.correct;
    const newScore = isCorrect ? score + 1 : score;

    if (currentIdx + 1 >= QUESTIONS.length) {
      setScore(newScore);
      setFinished(true);
    } else {
      setScore(newScore);
      setSelectedOption(null);
      setCurrentIdx((prev) => prev + 1);
    }
  };

  if (finished) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <div className="quiz-container">
        <div className="quiz-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: pct >= 60 ? '#10b981' : '#f59e0b', marginBottom: '1rem', display: 'block' }}>
            {pct >= 60 ? 'emoji_events' : 'school'}
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            Quiz Complete!
          </h2>
          <p style={{ color: 'var(--text-subtle)', marginBottom: '2rem' }}>
            You scored <strong style={{ color: 'var(--brand)' }}>{score}/{QUESTIONS.length}</strong> ({pct}%)
          </p>
          <button
            type="button"
            className="btn-quiz-next"
            style={{ margin: '0 auto' }}
            onClick={() => { setCurrentIdx(0); setSelectedOption(null); setScore(0); setFinished(false); }}
          >
            <span className="material-symbols-outlined">refresh</span>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>Practice Quiz</h1>
        <span className="quiz-counter">
          {currentIdx + 1} / {QUESTIONS.length}
        </span>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-card" key={currentIdx}>
        <h3 className="quiz-question">{q.question}</h3>

        <div className="quiz-options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`quiz-option-btn ${selectedOption === i ? 'selected' : ''}`}
              onClick={() => setSelectedOption(i)}
            >
              <span className="quiz-option-letter">{LETTERS[i]}</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="quiz-footer">
          <button
            type="button"
            className="btn-quiz-next"
            onClick={handleNext}
            disabled={selectedOption === null}
            style={{ opacity: selectedOption === null ? 0.5 : 1 }}
          >
            {currentIdx + 1 === QUESTIONS.length ? 'Finish Quiz' : 'Next Question'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
