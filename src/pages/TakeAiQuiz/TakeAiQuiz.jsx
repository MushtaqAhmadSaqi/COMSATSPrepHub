import React, { useState } from 'react';
import './TakeAiQuiz.css';

export default function TakeAiQuiz({ quizParams = { topic: 'Data Structures', difficulty: 'Medium' }, onFinish = () => {} }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const questions = [
    {
      q: 'Which traversal technique processes the root node first in a binary tree?',
      options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
      ans: 1
    },
    {
      q: 'What is the worst-case space complexity of QuickSort?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
      ans: 1
    }
  ];

  const currentQ = questions[currentIdx];

  return (
    <div className="take-ai-container">
      <div className="ai-quiz-header">
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>
            AI Generated • {quizParams.difficulty}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{quizParams.topic}</h2>
        </div>
        <span style={{ fontWeight: 800, color: '#0f766e' }}>Question {currentIdx + 1}/{questions.length}</span>
      </div>

      <div className="quiz-card">
        <h3 className="quiz-question">{currentQ.q}</h3>

        <div>
          {currentQ.options.map((opt, i) => (
            <button key={i} type="button" className="quiz-option-btn">
              {opt}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (currentIdx < questions.length - 1) {
              setCurrentIdx(currentIdx + 1);
            } else {
              onFinish();
            }
          }}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            background: '#0f766e',
            color: '#fff',
            fontWeight: 800,
            border: 'none',
            float: 'right',
            cursor: 'pointer'
          }}
        >
          {currentIdx === questions.length - 1 ? 'Finish AI Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
