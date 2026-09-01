import React, { useState } from 'react';
import './Upload.css';

export default function Upload() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
            <h3 className="upload-success-title">Upload Submitted!</h3>
            <p className="upload-success-text">
              Thank you for contributing! Your paper will be reviewed by our team
              and made public within 24–48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="upload-dropzone">
              <div className="upload-dropzone-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>cloud_upload</span>
              </div>
              <div className="upload-dropzone-title">Drag & drop your file here</div>
              <div className="upload-dropzone-hint">Supports PDF, PNG, JPG — up to 15MB</div>
            </div>

            <div className="ai-field">
              <label className="ai-label">Subject Code / Name</label>
              <input
                type="text"
                className="ai-input"
                placeholder="e.g. CSC211 — Data Structures & Algorithms"
                required
              />
            </div>

            <div className="ai-field">
              <label className="ai-label">Exam Type & Year</label>
              <input
                type="text"
                className="ai-input"
                placeholder="e.g. Terminal Examination — Fall 2023"
                required
              />
            </div>

            <div className="ai-field">
              <label className="ai-label">Your Name (Optional)</label>
              <input
                type="text"
                className="ai-input"
                placeholder="Your name for contributor credit"
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
