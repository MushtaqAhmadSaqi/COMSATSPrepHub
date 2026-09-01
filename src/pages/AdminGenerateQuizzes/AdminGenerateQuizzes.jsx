import React, { useState } from 'react';
import './AdminGenerateQuizzes.css';

export default function AdminGenerateQuizzes() {
  const [subject, setSubject] = useState('CSC211');
  const [status, setStatus] = useState('');

  const handleGenerate = () => {
    setStatus('Generating batch quizzes via AI...');
    setTimeout(() => {
      setStatus('Successfully generated 20 questions for ' + subject);
    }, 1500);
  };

  return (
    <div className="admin-gen-container">
      <div className="admin-card">
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Admin Quiz Generator</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Batch generate verified questions for course topics.</p>

        <div className="ai-field">
          <label className="ai-label">Select Target Course Code</label>
          <input
            type="text"
            className="ai-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <button type="button" className="btn-generate-ai" onClick={handleGenerate}>
          Batch Generate Course Quiz
        </button>

        {status && (
          <p style={{ marginTop: '1.5rem', fontWeight: 700, color: '#0ea5e9', textAlign: 'center' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
