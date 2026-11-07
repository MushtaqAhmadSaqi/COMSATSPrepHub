/**
 * SEO utility to update document metadata dynamically on route change.
 *
 * This app uses hash navigation, so every client-side route resolves to the
 * same crawlable document. Route metadata is still useful for browser history
 * and social previews, while the root URL remains the canonical URL.
 */

const SITE_URL = 'https://comsatsprephub.vercel.app/';
const DEFAULT_TITLE = 'COMSATSPrepHub — Prepare Smarter for COMSATS Exams';
const DEFAULT_DESCRIPTION = 'Access verified COMSATS University past papers, practice quizzes, AI quiz generation, flashcards, and SGPA/CGPA calculation. Built by students, for students.';

const PAGE_METADATA = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION
  },
  about: {
    title: 'Meet the Team — COMSATSPrepHub',
    description: 'Meet the students building COMSATSPrepHub, a practical exam-preparation platform for COMSATS University students.'
  },
  subjects: {
    title: 'COMSATS Subjects & Past Papers — COMSATSPrepHub',
    description: 'Browse COMSATS University courses by subject code and find verified past papers, model answers, and practice resources.'
  },
  'subject-papers': {
    title: 'Subject Past Papers — COMSATSPrepHub',
    description: 'Find verified COMSATS University past papers and model solutions for your course and semester.'
  },
  'paper-view': {
    title: 'Exam Paper & Solutions — COMSATSPrepHub',
    description: 'Review a COMSATS University exam paper, solutions, and related practice resources.'
  },
  quiz: {
    title: 'COMSATS Practice Quizzes — COMSATSPrepHub',
    description: 'Practice COMSATS exam MCQs with timed quizzes, instant explanations, and performance tracking.'
  },
  'ai-quiz-generator': {
    title: 'AI Quiz Generator for COMSATS Courses — COMSATSPrepHub',
    description: 'Generate custom AI practice quizzes for COMSATS University courses and focus on the topics you need to master.'
  },
  'take-ai-quiz': {
    title: 'AI Practice Quiz — COMSATSPrepHub',
    description: 'Take a personalized AI-generated quiz and review your COMSATS exam preparation results.'
  },
  dashboard: {
    title: 'Student Dashboard — COMSATSPrepHub',
    description: 'Track quiz performance, study streaks, bookmarks, and progress on COMSATSPrepHub.'
  },
  upload: {
    title: 'Upload a Past Paper — COMSATSPrepHub',
    description: 'Help COMSATS students by submitting a clear past examination paper or model solution for review.'
  },
  auth: {
    title: 'Sign In — COMSATSPrepHub',
    description: 'Sign in to sync your COMSATSPrepHub study progress, bookmarks, and quiz activity.'
  },
  terms: {
    title: 'Terms of Service — COMSATSPrepHub',
    description: 'Read the terms that apply when using COMSATSPrepHub exam-preparation resources and tools.'
  },
  'admin-generate': {
    title: 'Admin Quiz Generator — COMSATSPrepHub',
    description: 'Administrative quiz generation tools for COMSATSPrepHub content managers.'
  },
  'admin-paste': {
    title: 'Admin Paper Parser — COMSATSPrepHub',
    description: 'Administrative paper-import tools for COMSATSPrepHub content managers.'
  },
  gpa: {
    title: 'COMSATS GPA & CGPA Calculator — COMSATSPrepHub',
    description: 'Calculate your COMSATS University SGPA, CGPA, retake impact, and target semester grades.'
  },
  'study-hub': {
    title: 'Study Hub & Flashcards — COMSATSPrepHub',
    description: 'Review flashcards, daily challenges, and focused study resources for COMSATS University exams.'
  },
  'faq-contact': {
    title: 'FAQ & Contact — COMSATSPrepHub',
    description: 'Get answers about COMSATSPrepHub and contact the student team for support or contributions.'
  },
  faq: {
    title: 'FAQ & Contact — COMSATSPrepHub',
    description: 'Get answers about COMSATSPrepHub and contact the student team for support or contributions.'
  },
  contact: {
    title: 'Contact the COMSATSPrepHub Team',
    description: 'Contact the COMSATSPrepHub student team for support, feedback, or past-paper contributions.'
  },
  account: {
    title: 'Account Settings — COMSATSPrepHub',
    description: 'Manage your COMSATSPrepHub account and study preferences.'
  }
};

const NOINDEX_ROUTES = new Set([
  'auth',
  'dashboard',
  'upload',
  'admin-generate',
  'admin-paste',
  'account',
  'take-ai-quiz'
]);

function setMetaTag(attribute, value, content) {
  let element = document.querySelector(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function updatePageSeo(route = 'home', context = {}) {
  const { selectedSubject, selectedPaper } = context;
  const metadata = PAGE_METADATA[route] || PAGE_METADATA.home;
  let title = metadata.title;
  let description = metadata.description;

  if (route === 'subject-papers' && selectedSubject) {
    title = `${selectedSubject.name} (${selectedSubject.code}) Past Papers — COMSATSPrepHub`;
    description = `Study ${selectedSubject.name} (${selectedSubject.code}) with verified COMSATS University past papers, model solutions, and practice resources.`;
  } else if (route === 'paper-view' && selectedPaper) {
    title = `${selectedPaper.title || 'Paper'} — ${selectedSubject?.code || 'COMSATS'} — COMSATSPrepHub`;
    description = `View the ${selectedPaper.title || 'COMSATS exam paper'}${selectedSubject?.code ? ` for ${selectedSubject.code}` : ''}, with related solutions and study resources.`;
  }

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'robots', NOINDEX_ROUTES.has(route) ? 'noindex, nofollow' : 'index, follow');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', SITE_URL);
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);

  // Hash routes are client-side views of the same document, not separate URLs.
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', SITE_URL);
  }
}
