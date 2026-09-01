import React, { useState } from 'react';
import './AiQuizGenerator.css';

export default function AiQuizGenerator({ onStartAiQuiz = () => {} }) {
  const [topic, setTopic] = useState('Data Structures');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);

  return (
    <div className="ai-gen-container">
      <div className="ai-gen-card">
        <h1 className="ai-gen-title">
          <span className="material-symbols-outlined" style={{ color: '#0ea5e9' }}>auto_awesome</span>
          AI Quiz Generator
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Generate custom COMSATS-style quizzes on any subject powered by Gemini AI.
        </p>

        <div className="ai-field">
          <label className="ai-label">Select Subject or Topic</label>
          <input
            type="text"
            className="ai-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Binary Search Trees or Object Oriented Programming"
          />
        </div>

        <div className="ai-field">
          <label className="ai-label">Difficulty Level</label>
          <select
            className="ai-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="Easy">Easy (Sessional Level)</option>
            <option value="Medium">Medium (Midterm Level)</option>
            <option value="Hard">Hard (Terminal Exam Level)</option>
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Number of Questions</label>
          <select
            className="ai-select"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-generate-ai"
          onClick={() => onStartAiQuiz({ topic, difficulty, numQuestions })}
        >
          <span className="material-symbols-outlined">bolt</span>
          Generate Practice Quiz Now
        </button>
      </div>
    </div>
  );
}
