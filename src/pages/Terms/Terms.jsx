import React from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
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
    body: 'Your quiz progress, GPA calculations, and user profile details are managed for your personal performance tracking. Local study progress is stored in your browser and can be cleared at any time. We do not sell your personal data to third parties.'
  },
  {
    icon: 'upload_file',
    title: 'Content Contributions',
    body: 'Users who upload past papers certify that the content is shared educational revision material. The platform team reserves the right to remove any content that violates academic or copyright policies.'
  },
  {
    icon: 'manage_accounts',
    title: 'Account & Data Deletion',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. To request account or contributed-content removal, contact the support email listed in the footer.'
  }
];

export default function Terms() {
  return (
    <div className="terms-container">
      <PageHeader
        badge="Legal & Privacy"
        title="Terms of Service & Privacy"
        subtitle="Guidelines for using COMSATSPrepHub's past paper library, AI quiz tools, and GPA calculator."
      />

      <div className="terms-card">
        <p className="terms-intro">
          Welcome to COMSATSPrepHub. By accessing our platform, past paper repository,
          and AI quiz features, you agree to follow these community and privacy guidelines.
          <em> (Note: Draft educational platform policy — review with institutional guidelines before commercial deployment.)</em>
        </p>

        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="terms-section-title">
              <span className="material-symbols-outlined" aria-hidden="true">{s.icon}</span>
              {s.title}
            </h2>
            <p className="terms-body">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
