import React, { useState, useEffect } from 'react';
import {
  fetchQuestionsForPaperFromSupabase
} from '../../services/papersService';
import { isSafeHttpUrl } from '../../utils/adminGuard';
import {
  recordPaperView,
  isPaperBookmarked,
  togglePaperBookmark,
  getPaperNote,
  savePaperNote,
  addModerationSubmission
} from '../../utils/studyTracker';
import { useToast } from '../../utils/toast';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import Modal from '../../components/ui/Modal';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import MathText from '../../components/MathText/MathText';
import './PaperView.css';

/* ── Question text renderer ─────────────────────────────── */

function QuestionText({ text }) {
  return <MathText text={text} className="paperview-question-content" />;
}

function getPartText(part) {
  if (part == null) return '';
  if (typeof part !== 'object') return String(part);

  const text =
    part.text ??
    part.question_text ??
    part.questionText ??
    part.question;

  if (text != null) {
    return [part.label, text].filter(Boolean).join(' ');
  }

  return JSON.stringify(part, null, 2);
}

/* ── Lightweight safe markdown renderer ─────────────────── */

function MarkdownAnswer({ text }) {
  return <MathText text={text} className="paperview-md-body" />;
}

/* ── Component ──────────────────────────────────────────── */

export default function PaperView({
  paper = {
    id: 'default-paper',
    title: 'Terminal Examination — Fall 2023',
    term: 'Terminal',
    year: '2023',
    file_url: null,
    subjectName: 'Data Structures & Algorithms',
    subjectCode: 'CSC211'
  },
  onBack = () => {},
  onNavigate,
  onStartPaperQuiz,
  user = null,
  authReady = true,
  onRequireAuth = () => {}
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [readProgress, setReadProgress] = useState(0);

  // New interactive controls: zoom, bookmark, personal note, report problem modal
  const [zoomScale, setZoomScale] = useState(1);
  const [bookmarked, setBookmarked] = useState(() => isPaperBookmarked(paper?.id || paper?.title));
  const [noteText, setNoteText] = useState(() => getPaperNote(paper?.id || paper?.title));
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  const toast = useToast();
  const paperKey = paper?.id || paper?.title || 'default-paper';

  const safeFileUrl = isSafeHttpUrl(paper?.file_url) ? paper.file_url.trim() : null;
  const requiresAuthentication = authReady && !user;

  useEffect(() => {
    setBookmarked(isPaperBookmarked(paperKey));
    setNoteText(getPaperNote(paperKey));
  }, [paperKey]);



  useEffect(() => {
    if (user && (paper?.title || paper?.id)) {
      recordPaperView(paper);
    }
  }, [paper, user]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setReadProgress(0);
        return;
      }
      setReadProgress(Math.min(1, Math.max(0, window.scrollY / totalHeight)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;

    let cancelled = false;

    async function loadStoredQuestions() {
      setLoading(true);
      setError(null);
      setQuestions([]);
      setExpandedAnswers({});

      try {
        const rows = await fetchQuestionsForPaperFromSupabase(paper?.id, paper);
        if (!cancelled) setQuestions(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to retrieve this paper.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStoredQuestions();
    return () => {
      cancelled = true;
    };
  }, [paper, reloadKey, authReady]);

  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded =
    questions.length > 0 && questions.every((q) => Boolean(expandedAnswers[q.id]));

  const toggleAll = () => {
    const nextState = !allExpanded;
    const next = {};
    questions.forEach((q) => {
      next[q.id] = nextState;
    });
    setExpandedAnswers(next);
  };

  const handleDownload = () => {
    if (safeFileUrl) {
      window.open(safeFileUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.print();
    }
  };

  const handleBookmark = () => {
    const res = togglePaperBookmark({ ...paper, id: paperKey });
    setBookmarked(res.bookmarked);
    toast.success(res.bookmarked ? 'Saved paper to bookmarks!' : 'Removed from bookmarks.');
  };

  const handleSaveNote = () => {
    savePaperNote(paperKey, noteText);
    toast.success('Personal study notes saved!');
  };

  const handleQuizFromPaper = () => {
    if (typeof onStartPaperQuiz === 'function') {
      onStartPaperQuiz({
        topic: `${paper.subjectName || paper.title} (${paper.term || 'Exam'})`,
        subjectCode: paper.subjectCode || '',
        difficulty: 'Medium',
        numQuestions: 10
      });
    } else if (typeof onNavigate === 'function') {
      onNavigate('ai-quiz-generator');
    }
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    addModerationSubmission({
      type: 'report',
      subjectCode: paper.subjectCode || 'GENERAL',
      title: `Issue Report: ${paper.title}`,
      details: reportText.trim()
    });
    setReportText('');
    setReportModalOpen(false);
    toast.success('Thank you! Your report was sent to the moderation team.');
  };

  const displaySubject =
    paper.subjectName || paper.subjectCode || 'Past paper';

  const totalMarks =
    paper.totalMarks !== null &&
    paper.totalMarks !== undefined &&
    paper.totalMarks !== ''
      ? `${paper.totalMarks} Marks`
      : 'Not specified';

  const breadcrumbItems = [
    {
      label: 'Subjects',
      onClick: () => {
        if (typeof onNavigate === 'function') onNavigate('subjects');
        else onBack();
      }
    },
    { label: displaySubject, onClick: onBack },
    { label: paper.title || 'Paper View' }
  ];

  if (!authReady) {
    return (
      <div className="paperview-container" role="status" aria-live="polite">
        <div className="paperview-exam-sheet" style={{ padding: '2.5rem 1.5rem' }}>
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </div>
    );
  }


  return (
    <div className="paperview-container">
      {/* Reading progress */}
      <div
        className="paperview-progress-bar"
        style={{ transform: `scaleX(${readProgress})` }}
        aria-hidden="true"
      />

      {/* Toolbar */}
      <div className="paperview-top-actions">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="paperview-action-group">
          {/* Zoom controls */}
          <div
            role="group"
            aria-label="Zoom paper text"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              background: 'var(--surface)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.85, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out"
              style={{ border: 'none', background: 'transparent', padding: '0.45rem 0.7rem', color: 'var(--text)', minHeight: '40px' }}
            >
              A-
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 0.35rem', color: 'var(--text-subtle)' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in"
              style={{ border: 'none', background: 'transparent', padding: '0.45rem 0.7rem', color: 'var(--text)', minHeight: '40px' }}
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={handleBookmark}
            aria-pressed={bookmarked}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {bookmarked ? 'bookmark_added' : 'bookmark_add'}
            </span>
            {bookmarked ? 'Saved' : 'Bookmark'}
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={() => setShowNotesPanel((v) => !v)}
            aria-expanded={showNotesPanel}
          >
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            My Notes
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={handleQuizFromPaper}
          >
            <span className="material-symbols-outlined" aria-hidden="true">quiz</span>
            Quiz From This Paper
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={toggleAll}
            disabled={loading || questions.length === 0}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {allExpanded ? 'visibility_off' : 'visibility'}
            </span>
            {allExpanded ? 'Hide all answers' : 'Show all answers'}
          </button>

          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            Download / Print
          </button>
        </div>
      </div>

      {/* Personal Notes Drawer */}
      {showNotesPanel && (
        <section
          aria-label="Personal study notes for this paper"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
              Personal Study Notes — {paper.title}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Saved privately on your device</span>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Jot down key formulas, tricky concepts, or questions to revise from this paper…"
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              marginBottom: '0.75rem'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="paperview-btn-secondary" onClick={handleSaveNote}>
              <span className="material-symbols-outlined" aria-hidden="true">save</span>
              Save Note
            </button>
          </div>
        </section>
      )}

      {/* Exam sheet */}
      <div className="paperview-exam-sheet" style={{ fontSize: `${zoomScale}rem` }}>
        <div className="paperview-sheet-header">
          <div className="paperview-univ-title">
            COMSATS UNIVERSITY ISLAMABAD
          </div>

          <div className="paperview-exam-term">
            {paper.title || 'Past examination paper'}
          </div>

          <div className="paperview-meta-grid">
            <div>
              <strong>Subject</strong>
              <span>
                {displaySubject}
                {paper.subjectCode && paper.subjectName
                  ? ` (${paper.subjectCode})`
                  : ''}
              </span>
            </div>

            <div>
              <strong>Teacher / Instructor</strong>
              <span>{paper.instructorName || paper.teacher || 'COMSATS Faculty'}</span>
            </div>

            <div>
              <strong>Total marks</strong>
              <span>{totalMarks}</span>
            </div>

            <div>
              <strong>Year</strong>
              <span>{paper.year || 'Not specified'}</span>
            </div>

            <div>
              <strong>Semester</strong>
              <span>{paper.semester || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Safe PDF embed */}
        {safeFileUrl && (
          <div style={{
            margin: '1.5rem 0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            <iframe
              src={safeFileUrl}
              title={paper.title || 'Past examination paper PDF'}
              width="100%"
              height="500px"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        )}

        {/* Questions */}
        <div className="paperview-questions-section">
          <div className="paperview-questions-header">
            <div>
              <h2>Questions &amp; model answers</h2>
              <p>Work through each question at your own pace.</p>
            </div>

            {!loading && !error && questions.length > 0 && (
              <span className="paperview-question-count">
                {questions.length}{' '}
                {questions.length === 1 ? 'question' : 'questions'}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '1.5rem 0' }} aria-busy="true">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : error ? (
            <div role="alert" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p>{error}</p>
              <button
                type="button"
                className="paperview-btn-secondary"
                style={{ marginTop: '1rem' }}
                onClick={() => setReloadKey((v) => v + 1)}
              >
                Try again
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p>No saved questions were found for this paper.</p>
            </div>
          ) : (
            (requiresAuthentication ? questions.slice(0, 2) : questions).map((q, index) => {
              const isExpanded = Boolean(expandedAnswers[q.id]);
              const answerId = `paper-answer-${q.id}`;
              const headingId = `paper-question-${q.id}`;

              return (
                <article
                  key={q.id}
                  className="paperview-question-card"
                  aria-labelledby={headingId}
                >
                  <header className="paperview-question-top">
                    <div className="paperview-question-identity">
                      <span className="paperview-question-index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div>
                        <h3 className="paperview-question-title" id={headingId}>
                          {q.number || `Question ${index + 1}`}
                        </h3>

                        {q.section && (
                          <p className="paperview-q-section">{q.section}</p>
                        )}
                      </div>
                    </div>

                    {q.marks && (
                      <span className="paperview-marks">{q.marks}</span>
                    )}
                  </header>

                  <div className="paperview-question-body">
                    <QuestionText text={q.questionText} />

                    {Array.isArray(q.subParts) && q.subParts.length > 0 && (
                      <section className="paperview-subparts" aria-label="Question subparts">
                        <h4 className="paperview-small-heading">Subparts</h4>
                        <ol className="paperview-subparts-list" type="a">
                          {q.subParts.map((part, partIndex) => (
                            <li key={partIndex}>
                              <QuestionText text={getPartText(part)} />
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <section className="paperview-options" aria-label="Answer options">
                        <h4 className="paperview-small-heading">Choose an answer</h4>
                        <ol className="paperview-options-list" type="A">
                          {q.options.map((option, optionIndex) => (
                            <li key={optionIndex}>{getPartText(option)}</li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </div>

                  <footer className="paperview-question-footer">
                    <button
                      type="button"
                      className="paperview-toggle-sol-btn"
                      onClick={() => toggleAnswer(q.id)}
                      aria-expanded={isExpanded}
                      aria-controls={answerId}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {isExpanded ? 'expand_less' : 'lightbulb'}
                      </span>
                      {isExpanded ? 'Hide model answer' : 'View model answer'}
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {isExpanded ? 'remove' : 'add'}
                      </span>
                    </button>

                    <span className="paperview-answer-tip">
                      Try solving it before revealing the answer.
                    </span>
                  </footer>

                  <section
                    id={answerId}
                    className="paperview-answer-box"
                    hidden={!isExpanded}
                    aria-label={`Model answer for ${q.number || `Question ${index + 1}`}`}
                  >
                    <div className="paperview-answer-heading">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        school
                      </span>
                      <h4>Model answer</h4>
                    </div>

                    <MarkdownAnswer
                      text={q.answerText || 'No model answer is available yet.'}
                    />
                  </section>
                </article>
              );
            })
          )}
        </div>

        {/* Guest Mode Sign-In Prompt after 2-question preview */}
        {requiresAuthentication && (
          <div
            style={{
              textAlign: 'center',
              padding: '2.25rem 1.5rem',
              margin: '1.5rem 0',
              borderRadius: '16px',
              border: '1.5px dashed var(--brand)',
              background: 'var(--brand-soft)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--brand)' }} aria-hidden="true">
              lock_open
            </span>
            <h3 style={{ margin: '0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
              Sign in for free to unlock all {questions.length} questions &amp; solutions
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '32rem', margin: '0 auto 1.25rem', fontSize: '0.9rem' }}>
              You are viewing a 2-question guest preview. Sign in to view the complete exam paper, save personal notes, and bookmark papers across devices.
            </p>
            <button type="button" className="btn-download" onClick={onRequireAuth}>
              <span className="material-symbols-outlined" aria-hidden="true">login</span>
              Sign In to Unlock Full Paper
            </button>
          </div>
        )}

        {/* Download & Report Problem Footer */}
        <div className="paperview-download-footer">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.0625rem', marginBottom: '0.25rem' }}>
                Need an offline copy or spotted a typo?
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Download or print this paper with its model answers, or report an error for moderator review.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="paperview-btn-secondary"
                onClick={() => setReportModalOpen(true)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">flag</span>
                Report a problem
              </button>
              <button type="button" className="btn-download" onClick={handleDownload}>
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                Download / Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report a Problem Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report a Problem with This Paper"
      >
        <form onSubmit={handleReportSubmit}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginBottom: '0.75rem' }}>
            Let us know if a question is unclear, a model answer has an error, or a PDF link is broken for <strong>{paper.title}</strong>.
          </p>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Describe the issue (e.g., Question 2 option B formula typo)…"
            rows={4}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="paperview-btn-secondary" onClick={() => setReportModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-download">
              Submit Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
