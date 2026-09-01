import React, { useState } from 'react';
import './TakeAiQuiz.css';
import '../Quiz/Quiz.css';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TakeAiQuiz({
  quizParams = { topic: 'Data Structures', difficulty: 'Medium', numQuestions: 5 },
  onFinish = () => {}
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const questions = [
    {
      q: 'Which traversal technique processes the root node first in a binary tree?',
      options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
      ans: 1
    },
    {
      q: 'What is the worst-case space complexity of QuickSort?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      ans: 1
    }
  ];

  const q = questions[currentIdx];
  const progress = (currentIdx / questions.length) * 100;

  return (
    <div className="take-ai-container">
      {/* Header Banner */}
      <div className="ai-quiz-header">
        <div>
          <div className="ai-quiz-topic-badge">
            ✨ AI Generated · {quizParams.difficulty}
          </div>
          <div className="ai-quiz-topic-name">{quizParams.topic}</div>
        </div>
        <div className="ai-quiz-counter">
          {currentIdx + 1} / {questions.length}
        </div>
      </div>

      {/* Progress */}
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Card */}
      <div className="quiz-card" key={currentIdx}>
        <h3 className="quiz-question">{q.q}</h3>

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
            onClick={() => {
              setSelectedOption(null);
              if (currentIdx < questions.length - 1) {
                setCurrentIdx(currentIdx + 1);
              } else {
                onFinish();
              }
            }}
            disabled={selectedOption === null}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0d9488)',
              opacity: selectedOption === null ? 0.5 : 1
            }}
          >
            {currentIdx === questions.length - 1 ? 'Finish AI Quiz' : 'Next Question'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
