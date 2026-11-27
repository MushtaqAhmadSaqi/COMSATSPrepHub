import React, { useState } from 'react';
import { generateQuizWithGemini } from '../../services/aiQuizService';
import {
  getModerationSubmissions,
  updateModerationSubmissionStatus
} from '../../utils/studyTracker';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import PageHeader from '../../components/PageHeader/PageHeader';
import AppIcon from '../../components/ui/AppIcon';
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
    setStatus('Generating batch questions…');
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
      <div className="admin-stats-grid">
        <div className="admin-card admin-stat-card">
          <span className="admin-stat-label">Active Courses</span>
          <strong className="admin-stat-value admin-stat-value--brand tabular-nums">
            {DEFAULT_SUBJECTS.length}
          </strong>
        </div>
        <div className="admin-card admin-stat-card">
          <span className="admin-stat-label">Pending Moderation</span>
          <strong className="admin-stat-value admin-stat-value--warning tabular-nums">
            {pendingCount}
          </strong>
        </div>
        <div className="admin-card admin-stat-card">
          <span className="admin-stat-label">Total Submissions</span>
          <strong className="admin-stat-value tabular-nums">
            {submissions.length}
          </strong>
        </div>
      </div>

      {/* Moderation Queue */}
      <section className="admin-card admin-queue-card" aria-label="Moderation queue">
        <h2 className="admin-section-title">
          Moderation Queue (Uploads, Requests &amp; Reports)
        </h2>
        <p className="admin-section-desc">
          Review student-contributed past papers and problem reports before publishing.
        </p>

        <div className="admin-queue-list">
          {submissions.map((item) => (
            <div key={item.id} className="admin-queue-item">
              <div>
                <div className="admin-queue-head">
                  <span className="admin-queue-type">
                    {item.type}
                  </span>
                  <strong className="admin-queue-title">{item.title}</strong>
                </div>
                <div className="admin-queue-meta">
                  By {item.contributor} · {item.createdAt} · Status: <strong>{item.status}</strong>
                  {item.details ? ` · ${item.details}` : ''}
                </div>
              </div>

              <div className="admin-queue-actions">
                <button
                  type="button"
                  onClick={() => handleModerationAction(item.id, 'approved')}
                  className="admin-approve-btn"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleModerationAction(item.id, 'rejected')}
                  className="admin-reject-btn"
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
        <h2 className="admin-section-title admin-section-title--spaced">
          Batch Course Quiz Generator
        </h2>
        <div className="ai-field">
          <label className="ai-label" htmlFor="admin-course-code">Target Course Code / Title</label>
          <input
            id="admin-course-code"
            type="text"
            className="ai-input"
            value={subject}
            spellCheck={false}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. CSC211 - Data Structures"
            required
          />
        </div>

        <div className="admin-controls-grid">
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
          <AppIcon name="auto_awesome" size={18} />
          {loading ? 'Generating Batch…' : 'Batch Generate Course Quiz'}
        </button>

        {error && (
          <p role="alert" className="admin-status-msg admin-status-msg--error">
            {error}
          </p>
        )}

        {status && (
          <p role="status" className="admin-status-msg admin-status-msg--ok">
            {status}
          </p>
        )}

        {generatedList.length > 0 && (
          <div className="admin-output-wrap">
            <pre className="admin-output-pre">
              {JSON.stringify(generatedList, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
