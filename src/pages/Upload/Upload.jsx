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
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Upload Past Paper</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Contribute to your campus community by submitting exam papers & solution keys.
        </p>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#10b981' }}>check_circle</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem' }}>Upload Submitted!</h3>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Thank you! Your paper will be verified and made public shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="upload-dropzone">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0ea5e9' }}>cloud_upload</span>
              <p style={{ fontWeight: 700, marginTop: '0.5rem' }}>Drag & drop your PDF or image here</p>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Supports PDF, PNG, JPG up to 15MB</span>
            </div>

            <div className="ai-field">
              <label className="ai-label">Subject Code / Name</label>
              <input type="text" className="ai-input" placeholder="e.g. CSC211 - Data Structures" required />
            </div>

            <div className="ai-field">
              <label className="ai-label">Exam Type & Year</label>
              <input type="text" className="ai-input" placeholder="e.g. Terminal Exam - Fall 2023" required />
            </div>

            <button type="submit" className="btn-generate-ai">
              Submit Paper for Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
