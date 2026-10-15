import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AiQuizGenerator.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const SUGGESTED_TOPICS = [
  'Data Structures & Algorithms',
  'Object Oriented Programming',
  'Database Systems (SQL)',
  'Operating Systems',
  'Calculus & Analytical Geometry',
  'Computer Networks'
];

export default function AiQuizGenerator({ onStartAiQuiz = () => {} }) {
  const [topic, setTopic] = useState('Data Structures & Algorithms');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [topicError, setTopicError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = topic.trim();
    if (!cleaned) {
      setTopicError('Please enter a subject or topic to generate a quiz.');
      return;
    }
    if (cleaned.length > 120) {
      setTopicError('Topic must be 120 characters or fewer.');
      return;
    }
    setTopicError('');
    onStartAiQuiz({ topic: cleaned, difficulty, numQuestions });
  };

  return (
    <div className="ai-gen-container">
      <PageHeader
        badge="AI Tools"
        title="AI Quiz Generator"
        subtitle="Generate custom COMSATS-style practice quizzes on any subject, instantly powered by AI."
      />

      <form className="ai-gen-card" onSubmit={handleSubmit} noValidate>
        {/* Topic */}
        <div className="ai-field">
          <label className="ai-label" htmlFor="ai-topic-input">Subject / Topic</label>
          <input
            id="ai-topic-input"
            type="text"
            className={`ai-input${topicError ? ' auth-input--error' : ''}`}
            value={topic}
            maxLength={120}
            aria-invalid={Boolean(topicError)}
            aria-describedby={topicError ? 'ai-topic-error' : undefined}
            onChange={(e) => {
              setTopic(e.target.value);
              if (topicError) setTopicError('');
            }}
            placeholder="e.g. Binary Search Trees, Object Oriented Programming..."
            required
          />
          {topicError && (
            <p id="ai-topic-error" className="auth-field-error" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }} aria-hidden="true">error</span>
              {topicError}
            </p>
          )}

          {/* Quick-pick topic suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }} aria-label="Suggested COMSATS topics">
            {SUGGESTED_TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTopic(item);
                  setTopicError('');
                }}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--border)',
                  background: topic === item ? 'var(--brand-soft)' : 'var(--surface-2)',
                  color: topic === item ? 'var(--brand)' : 'var(--text-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="ai-field">
          <label className="ai-label">Difficulty Level</label>
          <div className="ai-difficulty-grid" role="group" aria-label="Select difficulty level">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={difficulty === d}
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
          <div className="ai-count-grid" role="group" aria-label="Select number of questions">
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={numQuestions === n}
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
          type="submit"
          className="btn-generate-ai"
        >
          <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
          Generate Practice Quiz
        </button>
      </form>
    </div>
  );
}
