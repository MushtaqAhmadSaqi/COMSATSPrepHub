import React from 'react';
import './Terms.css';

export default function Terms() {
  return (
    <div className="terms-container">
      <div className="terms-card">
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Terms of Service</h1>
        <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Welcome to COMSATSPrepHub. By accessing or using our platform, past paper repository, and AI quiz features, you agree to follow these guidelines.
        </p>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Academic Integrity</h3>
        <p style={{ color: '#64748b', lineHeight: 1.7 }}>
          COMSATSPrepHub is designed strictly for study and self-assessment purposes. All past papers are contributed by students for educational reference.
        </p>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Privacy & Data Usage</h3>
        <p style={{ color: '#64748b', lineHeight: 1.7 }}>
          Your quiz progress, GPA calculations, and user profile details are safely managed for your personal performance tracking.
        </p>
      </div>
    </div>
  );
}
