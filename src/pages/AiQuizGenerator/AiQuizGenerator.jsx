import React, { useState } from 'react';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AiQuizGenerator.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15, 20];
const QUESTION_TYPES = [
  { id: 'mcq', label: 'Standard Exam MCQs' },
  { id: 'conceptual', label: 'Conceptual (Why / How)' },
  { id: 'mixed', label: 'Mixed Scenario & Analytical' }
];
const SUGGESTED_TOPICS = [
  'Data Structures & Algorithms',
  'Object Oriented Programming',
  'Database Systems (SQL & Normalization)',
  'Operating Systems (Deadlocks & Scheduling)',
  'Calculus & Analytical Geometry',
  'Computer Networks (OSI & TCP/IP)'
];

export default function AiQuizGenerator({ onStartAiQuiz = () => {} }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState('CSC211');
  const [topic, setTopic] = useState('Data Structures & Algorithms — Binary Search Trees & Graphs');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState('mcq');
  const [honeypot, setHoneypot] = useState('');
  const [topicError, setTopicError] = useState('');

  const handleCourseChange = (code) => {
    setSelectedCourseCode(code);
    const match = DEFAULT_SUBJECTS.find((s) => s.code === code);
    if (match) {
      setTopic(match.name);
      setTopicError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (honeypot) return;

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
    onStartAiQuiz({
      topic: cleaned,
      subjectCode: selectedCourseCode,
      difficulty,
      numQuestions,
      questionType
    });
  };

  return (
    <div className="ai-gen-container">
      <PageHeader
        badge="AI Tools"
        title="AI Quiz Generator"
        subtitle="Generate custom COMSATS-style practice quizzes on any course or topic, with automatic fallback across Gemini, Groq, and OpenRouter."
      />

      <form className="ai-gen-card" onSubmit={handleSubmit} noValidate>
        {/* Honeypot anti-bot field */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
        />

        {/* Course Selector */}
        <div className="ai-field">
          <label className="ai-label" htmlFor="ai-course-select">COMSATS Course (Optional)</label>
          <select
            id="ai-course-select"
            className="ai-input"
            value={selectedCourseCode}
            onChange={(e) => handleCourseChange(e.target.value)}
          >
            <option value="">Custom Topic / Any Course</option>
            {DEFAULT_SUBJECTS.map((subj) => (
              <option key={subj.code} value={subj.code}>
                {subj.code} — {subj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div className="ai-field">
          <label className="ai-label" htmlFor="ai-topic-input">Specific Topic or Chapter</label>
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
            placeholder="e.g. AVL Tree Rotations, SQL Normalization, Deadlock Prevention..."
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
                  padding: '0.35rem 0.75rem',
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

        {/* Question Type */}
        <div className="ai-field">
          <label className="ai-label">Question Style</label>
          <div className="ai-difficulty-grid" role="group" aria-label="Select question style">
            {QUESTION_TYPES.map((qt) => (
              <button
                key={qt.id}
                type="button"
                aria-pressed={questionType === qt.id}
                className={`ai-chip ${questionType === qt.id ? 'selected' : ''}`}
                onClick={() => setQuestionType(qt.id)}
              >
                {qt.label}
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
        <button type="submit" className="btn-generate-ai">
          <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
          Generate Practice Quiz
        </button>
      </form>
    </div>
  );
}
