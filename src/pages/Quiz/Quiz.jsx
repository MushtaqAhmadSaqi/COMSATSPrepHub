import React, { useState } from 'react';
import './Quiz.css';

export default function Quiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const sampleQuestions = [
    {
      question: 'What is the time complexity of searching in a balanced Binary Search Tree?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
      correct: 2
    },
    {
      question: 'Which data structure follows the FIFO (First In First Out) principle?',
      options: ['Stack', 'Queue', 'Array', 'Tree'],
      correct: 1
    }
  ];

  const q = sampleQuestions[currentIdx];

  return (
    <div className="quiz-container">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Practice Quiz</h1>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0ea5e9' }}>
          Question {currentIdx + 1} of {sampleQuestions.length}
        </span>
      </div>

      <div className="quiz-card">
        <h3 className="quiz-question">{q.question}</h3>

        <div>
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`quiz-option-btn ${selectedOption === i ? 'selected' : ''}`}
              onClick={() => setSelectedOption(i)}
            >
              {opt}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedOption(null);
            setCurrentIdx((prev) => (prev + 1) % sampleQuestions.length);
          }}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            background: '#0ea5e9',
            color: '#fff',
            fontWeight: 800,
            border: 'none',
            float: 'right',
            cursor: 'pointer'
          }}
        >
          Next Question
        </button>
      </div>
    </div>
  );
}
