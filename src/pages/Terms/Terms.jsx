import React from 'react';
import './Terms.css';

const SECTIONS = [
  {
    icon: 'school',
    title: 'Academic Integrity',
    body: 'COMSATSPrepHub is designed strictly for study and self-assessment purposes. All past papers are contributed by students for educational reference only. Misuse for academic dishonesty is strictly prohibited.'
  },
  {
    icon: 'lock',
    title: 'Privacy & Data Usage',
    body: 'Your quiz progress, GPA calculations, and user profile details are securely managed for your personal performance tracking. We do not sell or share your data with third parties.'
  },
  {
    icon: 'upload_file',
    title: 'Content Contributions',
    body: 'Users who upload past papers certify that the content is publicly shared educational material. The platform reserves the right to remove any content that violates academic or copyright policies.'
  },
  {
    icon: 'manage_accounts',
    title: 'Account Responsibility',
    body: 'You are responsible for maintaining the confidentiality of your account. Please use a secure, unique password and report any unauthorized access immediately.'
  }
];

export default function Terms() {
  return (
    <div className="terms-container">
      <div className="terms-card">
        <h1 className="terms-title">Terms of Service</h1>
        <p className="terms-intro">
          Welcome to COMSATSPrepHub. By accessing our platform, past paper repository,
          and AI quiz features, you agree to follow these guidelines. Please read them carefully.
        </p>

        {SECTIONS.map((s, i) => (
          <div key={i}>
            <h3 className="terms-section-title">
              <span className="material-symbols-outlined">{s.icon}</span>
              {s.title}
            </h3>
            <p className="terms-body">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
