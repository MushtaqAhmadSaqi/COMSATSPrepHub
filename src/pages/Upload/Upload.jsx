import React, { useState } from 'react';
import { fireConfetti } from '../../utils/confetti';
import './Upload.css';

export default function Upload() {
  const [submitted, setSubmitted] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [examType, setExamType] = useState('');
  const [uploaderName, setUploaderName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    fireConfetti({ count: 90, spread: 80 });
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
          Upload Past Paper
        </h1>
        <p style={{ color: 'var(--text-subtle)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
          Contribute to your campus community by submitting exam papers & solution keys.
        </p>

        {submitted ? (
          <div className="upload-success">
            <div className="upload-success-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check_circle</span>
            </div>
            <h3 className="upload-success-title">Thank You, {uploaderName || 'Contributor'}! 🎉</h3>
            <p className="upload-success-text">
              Your upload for <strong>{subjectCode || 'Past Paper'}</strong> has been received.
              Our student moderation team will review and publish it within 24 hours.
            </p>
            <button
              type="button"
              className="btn-primary-pill"
              style={{ margin: '1.5rem auto 0 auto' }}
              onClick={() => {
                setSubmitted(false);
                setSubjectCode('');
                setExamType('');
              }}
            >
              Upload Another Paper
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="upload-dropzone">
              <div className="upload-dropzone-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>cloud_upload</span>
              </div>
              <div className="upload-dropzone-title">Drag & drop your paper file here</div>
              <div className="upload-dropzone-hint">Supports PDF, PNG, JPG — up to 15MB</div>
            </div>

            <div className="ai-field">
              <label className="ai-label">Subject Code / Name</label>
              <input
                type="text"
                className="ai-input"
                placeholder="e.g. CSC211 — Data Structures & Algorithms"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                required
              />
            </div>

            <div className="ai-field">
              <label className="ai-label">Exam Type & Year</label>
              <input
                type="text"
                className="ai-input"
                placeholder="e.g. Terminal Examination — Fall 2023"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                required
              />
            </div>

            <div className="ai-field">
              <label className="ai-label">Your Name (Optional)</label>
              <input
                type="text"
                className="ai-input"
                placeholder="Your name for contributor credit"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-generate-ai">
              <span className="material-symbols-outlined">upload</span>
              Submit Paper for Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
