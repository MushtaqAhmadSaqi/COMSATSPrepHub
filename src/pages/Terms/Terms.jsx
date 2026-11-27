import React from 'react';
import AppIcon from '../../components/ui/AppIcon';
import PageHeader from '../../components/PageHeader/PageHeader';
import './Terms.css';

const SECTIONS = [
  {
    icon: 'gavel',
    title: 'Terms of Use & Academic Integrity',
    body: 'COMSATSPrepHub is an independent, student-built educational platform designed strictly for revision, self-assessment, and academic planning. All past papers, model solutions, and AI-generated practice quizzes are provided for educational reference only. Using the platform for live exam misconduct or academic dishonesty is strictly prohibited.'
  },
  {
    icon: 'shield_lock',
    title: 'Privacy Policy & Minimal Data Handling',
    body: 'We collect only the minimum information required to provide your study workspace: (a) if you use Guest Mode, your quiz history, bookmarks, flashcards, and GPA calculations stay locally in your browser (localStorage/sessionStorage under `pph_*` keys) and are never sent to our servers; (b) if you create a Supabase account, your email address and display name are stored in our Row-Level-Security (RLS) protected database, and your study activity feed is synced there so only you can read or delete your rows (bookmarks, notes, flashcards, GPA plans, and exam countdowns remain in your browser only); (c) AI quiz generation sends only the sanitized course/topic name to our server endpoint (`/api/generate-quiz`) and never transmits your personal identity or email to AI providers. We never sell or rent student data.'
  },
  {
    icon: 'cookie',
    title: 'LocalStorage, SessionStorage & Analytics Notice',
    body: 'COMSATSPrepHub uses browser storage strictly for essential functionality: `pph_dark` (theme preference), `pph_study_history` / `pph_bookmarks` / `pph_paper_notes` (local study progress), `sessionStorage` navigation state, and Supabase PKCE session tokens when signed in. Optional anonymous analytics only load if you accept the analytics notice and do not have Do Not Track enabled.'
  },
  {
    icon: 'copyright',
    title: 'Educational Disclaimer & Copyright Takedown Policy',
    body: 'COMSATSPrepHub is not an official website of COMSATS University Islamabad. Course codes and past examination questions are shared by students under fair educational study principles. If you are a faculty member, department representative, or copyright holder and wish to request the removal or modification of any specific past paper or resource, please email mushtaqahmedsaqi1234@gmail.com with the subject code and paper title; we process takedown requests within 24 to 48 hours.'
  },
  {
    icon: 'manage_accounts',
    title: 'Account Control, Data Export & Deletion',
    body: 'You can export all of your study data as JSON or permanently clear all local and cloud study records at any time from the Account Settings page (#account), or by contacting mushtaqahmedsaqi1234@gmail.com.'
  }
];

export default function Terms({ section = 'terms' }) {
  const headerTitles = {
    terms: 'Terms of Use, Privacy Policy & Disclaimer',
    privacy: 'Privacy Policy & Data Handling',
    disclaimer: 'Educational Disclaimer & Copyright Takedown'
  };
  const priorityIndex = { privacy: 1, disclaimer: 3 }[section] ?? 0;
  const orderedSections = [
    SECTIONS[priorityIndex],
    ...SECTIONS.filter((_, index) => index !== priorityIndex)
  ];

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

        {orderedSections.map((policySection, index) => (
          <section key={policySection.title}>
            <h2 className="terms-section-title">
              <AppIcon name={policySection.icon} size={20} />
              {index + 1}. {policySection.title}
            </h2>
            <p className="terms-body">{policySection.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
