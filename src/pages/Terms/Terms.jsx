import React from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import './Terms.css';

const SECTIONS = [
  {
    icon: 'gavel',
    title: '1. Terms of Use & Academic Integrity',
    body: 'COMSATSPrepHub is an independent, student-built educational platform designed strictly for revision, self-assessment, and academic planning. All past papers, model solutions, and AI-generated practice quizzes are provided for educational reference only. Using the platform for live exam misconduct or academic dishonesty is strictly prohibited.'
  },
  {
    icon: 'shield_lock',
    title: '2. Privacy Policy & Minimal Data Handling',
    body: 'We collect only the minimum information required to provide your study workspace: (a) if you use Guest Mode, your quiz history, bookmarks, flashcards, and GPA calculations stay locally in your browser (localStorage/sessionStorage under `pph_*` keys) and are never sent to our servers; (b) if you create a Supabase account, your email address, display name, and synced study progress are stored in our Row-Level-Security (RLS) protected database where only you can read or modify your rows; (c) AI quiz generation sends only the sanitized course/topic name to our server endpoint (`/api/generate-quiz`) and never transmits your personal identity or email to AI providers. We never sell or rent student data.'
  },
  {
    icon: 'cookie',
    title: '3. LocalStorage, SessionStorage & Analytics Notice',
    body: 'COMSATSPrepHub uses browser storage strictly for essential functionality: `pph_dark` (theme preference), `pph_study_history` / `pph_bookmarks` / `pph_paper_notes` (local study progress), `sessionStorage` navigation state, and Supabase PKCE session tokens when signed in. Optional anonymous analytics only load if you accept the analytics notice and do not have Do Not Track enabled.'
  },
  {
    icon: 'copyright',
    title: '4. Educational Disclaimer & Copyright Takedown Policy',
    body: 'COMSATSPrepHub is not an official website of COMSATS University Islamabad. Course codes and past examination questions are shared by students under fair educational study principles. If you are a faculty member, department representative, or copyright holder and wish to request the removal or modification of any specific past paper or resource, please email mushtaqahmedsaqi1234@gmail.com with the subject code and paper title — we process takedown requests within 24–48 hours.'
  },
  {
    icon: 'manage_accounts',
    title: '5. Account Control, Data Export & Deletion',
    body: 'You can export all of your study data as JSON or permanently clear all local and cloud study records at any time from the Account Settings page (#account), or by contacting mushtaqahmedsaqi1234@gmail.com.'
  }
];

export default function Terms({ section = 'terms' }) {
  const headerTitles = {
    terms: 'Terms of Use, Privacy Policy & Disclaimer',
    privacy: 'Privacy Policy & Data Handling',
    disclaimer: 'Educational Disclaimer & Copyright Takedown'
  };

  return (
    <div className="terms-container">
      <PageHeader
        badge="Legal, Privacy & Copyright"
        title={headerTitles[section] || headerTitles.terms}
        subtitle="Transparent policies for COMSATSPrepHub's past paper library, AI quiz tools, GPA calculator, and student privacy."
      />

      <div className="terms-card">
        <p className="terms-intro">
          Last updated: October 2026. Welcome to COMSATSPrepHub. By accessing our platform, past paper repository,
          and study tools, you agree to these community, privacy, and educational use guidelines.
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
