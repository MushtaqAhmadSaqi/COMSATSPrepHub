/**
 * SEO utility to update document title and meta tags dynamically on route change.
 */

const PAGE_TITLES = {
  home: 'COMSATSPrepHub — Prepare Smarter for COMSATS Exams',
  about: 'Meet the Team — COMSATSPrepHub',
  subjects: 'Browse Subjects & Past Papers — COMSATSPrepHub',
  'subject-papers': 'Subject Past Papers — COMSATSPrepHub',
  'paper-view': 'Exam Paper & Solutions — COMSATSPrepHub',
  quiz: 'Practice Quizzes — COMSATSPrepHub',
  'ai-quiz-generator': 'AI Quiz Generator — COMSATSPrepHub',
  'take-ai-quiz': 'AI Practice Quiz — COMSATSPrepHub',
  dashboard: 'Student Dashboard — COMSATSPrepHub',
  upload: 'Upload Past Paper — COMSATSPrepHub',
  auth: 'Sign In — COMSATSPrepHub',
  terms: 'Terms of Service — COMSATSPrepHub',
  'admin-generate': 'Admin Quiz Generator — COMSATSPrepHub',
  'admin-paste': 'Admin Paper Parser — COMSATSPrepHub',
  gpa: 'COMSATS GPA & CGPA Calculator — COMSATSPrepHub',
  'study-hub': 'Study Hub & Flashcards — COMSATSPrepHub',
  faq: 'FAQ & Support — COMSATSPrepHub',
  contact: 'Contact Us — COMSATSPrepHub',
  'faq-contact': 'FAQ & Support — COMSATSPrepHub',
  account: 'Account Settings — COMSATSPrepHub'
};

export function updatePageSeo(route = 'home', context = {}) {
  const { selectedSubject, selectedPaper } = context;
  let title = PAGE_TITLES[route] || 'COMSATSPrepHub — Prepare Smarter for COMSATS Exams';

  if (route === 'subject-papers' && selectedSubject) {
    title = `${selectedSubject.name} (${selectedSubject.code}) Past Papers — COMSATSPrepHub`;
  } else if (route === 'paper-view' && selectedPaper) {
    title = `${selectedPaper.title || 'Paper'} — ${selectedSubject?.code || 'COMSATS'} — COMSATSPrepHub`;
  }

  document.title = title;

  // Update canonical if available
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', `https://comsatsprephub.vercel.app/${route === 'home' ? '' : '#' + route}`);
  }
}

