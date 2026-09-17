import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AiQuizGenerator.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];

export default function AiQuizGenerator({ onStartAiQuiz = () => {} }) {
  const [topic, setTopic] = useState('Data Structures');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);

  return (
    <div className="ai-gen-container">
      <PageHeader
        badge="AI Tools"
        title="AI Quiz Generator"
        subtitle="Generate custom COMSATS-style practice quizzes on any subject, instantly powered by Gemini AI."
      />

      <div className="ai-gen-card">

        {/* Topic */}
        <div className="ai-field">
          <label className="ai-label" htmlFor="ai-topic-input">Subject / Topic</label>
          <input
            id="ai-topic-input"
            type="text"
            className="ai-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Binary Search Trees, Object Oriented Programming..."
          />
        </div>

        {/* Difficulty */}
        <div className="ai-field">
          <label className="ai-label">Difficulty Level</label>
          <div className="ai-difficulty-grid">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`ai-chip ${difficulty === d ? 'selected' : ''}`}
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
        <div className="ai-field">
          <label className="ai-label">Number of Questions</label>
          <div className="ai-count-grid">
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                className={`ai-count-chip ${numQuestions === n ? 'selected' : ''}`}
                onClick={() => setNumQuestions(n)}
              >
                {n} Qs
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          type="button"
          className="btn-generate-ai"
          onClick={() => onStartAiQuiz({ topic, difficulty, numQuestions })}
        >
          <span className="material-symbols-outlined">bolt</span>
          Generate Practice Quiz
        </button>
      </div>
    </div>
  );
}
