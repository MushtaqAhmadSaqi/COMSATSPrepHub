import React, { useState } from 'react';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AdminGenerateQuizzes.css';

export default function AdminGenerateQuizzes() {
  const [subject, setSubject] = useState('CSC211');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [generatedList, setGeneratedList] = useState([]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please enter a target course code or subject name.');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Generating batch questions...');
    try {
      const questions = await generateQuizWithGemini({
        subject: subject.trim(),
        subjectCode: subject.trim(),
        numQuestions: Number(count) || 10,
        difficulty
      });
      setGeneratedList(questions);
      setStatus(`Generated ${questions.length} verified questions for ${subject.trim()}.`);
    } catch (err) {
      setError(err.message || 'Failed to generate batch quiz.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-gen-container">
      <PageHeader
        badge="Admin Workspace"
        title="Admin Quiz Generator"
        subtitle="Batch generate and inspect structured multiple-choice questions for COMSATS courses."
      />

      <form className="admin-card" onSubmit={handleGenerate}>
        <div className="ai-field">
          <label className="ai-label" htmlFor="admin-course-code">Target Course Code / Title</label>
          <input
            id="admin-course-code"
            type="text"
            className="ai-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. CSC211 — Data Structures"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="ai-label" htmlFor="admin-difficulty">Difficulty</label>
            <select
              id="admin-difficulty"
              className="ai-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="ai-label" htmlFor="admin-q-count">Question Count</label>
            <select
              id="admin-q-count"
              className="ai-select"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-generate-ai" disabled={loading}>
          <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
          {loading ? 'Generating Batch…' : 'Batch Generate Course Quiz'}
        </button>

        {error && (
          <p role="alert" style={{ marginTop: '1.25rem', fontWeight: 700, color: 'var(--danger)', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {status && (
          <p role="status" style={{ marginTop: '1.25rem', fontWeight: 700, color: 'var(--brand)', textAlign: 'center' }}>
            {status}
          </p>
        )}

        {generatedList.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <pre
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.8125rem',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {JSON.stringify(generatedList, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
