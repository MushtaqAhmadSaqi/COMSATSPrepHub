import React, { useState } from 'react';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import {
  getModerationSubmissions,
  updateModerationSubmissionStatus
} from '../../utils/studyTracker';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
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
  const [submissions, setSubmissions] = useState(() => getModerationSubmissions());

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

  const handleModerationAction = (id, nextStatus) => {
    const updated = updateModerationSubmissionStatus(id, nextStatus);
    setSubmissions(updated);
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="admin-gen-container">
      <PageHeader
        badge="Admin Workspace"
        title="Admin Dashboard & Moderation Queue"
        subtitle="Manage student uploads, paper requests, issue reports, and batch-generate course quizzes."
      />

      {/* Admin Usage Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)' }}>ACTIVE COURSES</span>
          <strong style={{ display: 'block', fontSize: '1.75rem', fontWeight: 900, color: 'var(--brand)' }}>
            {DEFAULT_SUBJECTS.length}
          </strong>
        </div>
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)' }}>PENDING MODERATION</span>
          <strong style={{ display: 'block', fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning)' }}>
            {pendingCount}
          </strong>
        </div>
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)' }}>TOTAL SUBMISSIONS</span>
          <strong style={{ display: 'block', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>
            {submissions.length}
          </strong>
        </div>
      </div>

      {/* Moderation Queue */}
      <section className="admin-card" style={{ marginBottom: '2rem' }} aria-label="Moderation queue">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>
          Moderation Queue (Uploads, Requests &amp; Reports)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
          Review student-contributed past papers and problem reports before publishing.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {submissions.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: 'var(--brand-soft)',
                      color: 'var(--brand)'
                    }}
                  >
                    {item.type}
                  </span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                  By {item.contributor} · {item.createdAt} · Status: <strong>{item.status}</strong>
                  {item.details ? ` · ${item.details}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => handleModerationAction(item.id, 'approved')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleModerationAction(item.id, 'rejected')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Batch Quiz Generator */}
      <form className="admin-card" onSubmit={handleGenerate}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text)' }}>
          Batch Course Quiz Generator
        </h2>
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
