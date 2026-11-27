import React, { useState, useEffect, useRef } from 'react';
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
import { getPaperKey, hasPaperIdentity } from '../../utils/paperSelection';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import Modal from '../../components/ui/Modal';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import MathText from '../../components/MathText/MathText';
import AppIcon from '../../components/ui/AppIcon';
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
  paper = null,
  onBack = () => {},
  onNavigate,
  onStartPaperQuiz,
  user = null,
  authReady = true,
  onRequireAuth = () => {}
}) {
  const paperKey = getPaperKey(paper);
  const hasPaper = hasPaperIdentity(paper);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const progressBarRef = useRef(null);

  // New interactive controls: zoom, bookmark, personal note, report problem modal
  const [zoomScale, setZoomScale] = useState(1);
  const [bookmarked, setBookmarked] = useState(() => (paperKey ? isPaperBookmarked(paperKey) : false));
  const [noteText, setNoteText] = useState(() => (paperKey ? getPaperNote(paperKey) : ''));
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  const toast = useToast();

  const safeFileUrl = isSafeHttpUrl(paper?.file_url) ? paper.file_url.trim() : null;
  const requiresAuthentication = authReady && !user;

  useEffect(() => {
    if (!paperKey) {
      setBookmarked(false);
      setNoteText('');
      return;
    }
    setBookmarked(isPaperBookmarked(paperKey));
    setNoteText(getPaperNote(paperKey));
  }, [paperKey]);



  useEffect(() => {
    if (user && hasPaper) {
      recordPaperView(paper);
    }
  }, [hasPaper, paperKey, user]);

  useEffect(() => {
    const supportsScrollTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline', 'scroll()');
    if (supportsScrollTimeline) return undefined;

    const handleScroll = () => {
      const el = progressBarRef.current;
      if (!el) return;
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = totalHeight <= 0
        ? 0
        : Math.min(1, Math.max(0, window.scrollY / totalHeight));
      el.style.setProperty('--read-progress', String(ratio));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!authReady || !hasPaper) {
      setLoading(false);
      return undefined;
    }

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
  }, [hasPaper, paperKey, reloadKey, authReady]);

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
    if (!paperKey) {
      toast.error('Notes are unavailable for this paper.');
      return;
    }
    const saved = savePaperNote(paperKey, noteText);
    if (saved) toast.success('Personal study notes saved!');
    else toast.error('Could not save notes; browser storage is full or unavailable.');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const active = document.activeElement;
      if (active?.isContentEditable || active?.closest('input, textarea, select, [role="dialog"], dialog')) return;

      const lower = String(e.key).toLowerCase();
      if (lower === 'j' || lower === 'k') {
        const cards = Array.from(document.querySelectorAll('.paperview-question-card'));
        if (cards.length === 0) return;
        e.preventDefault();
        const navOffset = 100;
        const currentIdx = cards.findIndex((card) => card.getBoundingClientRect().top >= navOffset - 12);
        let nextIdx;
        if (lower === 'j') {
          nextIdx = currentIdx === -1 ? cards.length - 1 : Math.min(cards.length - 1, currentIdx + 1);
        } else {
          nextIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
        }
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        cards[nextIdx].scrollIntoView({ block: 'start', behavior: reduce ? 'instant' : 'smooth' });
      } else if (lower === 'e') {
        if (!loading && questions.length > 0) {
          e.preventDefault();
          toggleAll();
        }
      } else if (lower === 'b') {
        if (hasPaper) {
          e.preventDefault();
          handleBookmark();
        }
      } else if (lower === 'n') {
        if (hasPaper) {
          e.preventDefault();
          setShowNotesPanel((v) => !v);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    const { sync } = addModerationSubmission({
      type: 'report',
      subjectCode: paper.subjectCode || 'GENERAL',
      title: `Issue Report: ${paper.title}`,
      details: reportText.trim()
    });
    setReportText('');
    setReportModalOpen(false);
    const result = await sync;
    if (result.ok) {
      toast.success('Thank you! Your report is in the moderation queue.');
    } else {
      toast.error(
        'We could not reach the server, so your report was only saved in this browser. Please retry or email us directly.'
      );
    }
  };

  if (!authReady) {
    return (
      <div className="paperview-container" role="status" aria-live="polite">
        <div className="paperview-exam-sheet paperview-exam-sheet--state">
          <SkeletonListItem />
          <SkeletonListItem />
        </div>
      </div>
    );
  }

  if (!hasPaper) {
    return (
      <div className="paperview-container">
        <div className="paperview-exam-sheet paperview-exam-sheet--empty">
          <div className="paperview-empty-icon">
            <AppIcon name="description" size={40} />
          </div>
          <h2 className="paperview-empty-title">No paper selected</h2>
          <p className="paperview-empty-desc">
            Choose a course and paper to view its questions and model answers.
          </p>
          <button type="button" className="paperview-btn-secondary" onClick={onBack}>
            <AppIcon name="arrow_back" size={18} />
            Back to papers
          </button>
        </div>
      </div>
    );
  }

  const displaySubject =
    paper.subjectName || paper.subjectCode || 'Past paper';

  const totalMarks =
    paper.totalMarks !== null &&
    paper.totalMarks !== undefined &&
    paper.totalMarks !== ''
      ? `${paper.totalMarks} Marks`
      : 'Not specified';

  const isSamplePaper =
    Boolean(paper.isSample) || String(paper.id || '').startsWith('fallback-');
  const usesCuratedQuestions =
    questions.length > 0 && questions.every((q) => q?.source === 'curated');

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

  return (
    <div className="paperview-container">
      {/* Reading progress */}
      <div
        ref={progressBarRef}
        className="paperview-progress-bar"
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
            className="paperview-zoom-group"
          >
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.85, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out"
              className="paperview-zoom-btn"
            >
              A-
            </button>
            <span className="tabular-nums paperview-zoom-value">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in"
              className="paperview-zoom-btn"
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
            <AppIcon name={bookmarked ? 'bookmark_added' : 'bookmark_add'} size={18} />
            {bookmarked ? 'Saved' : 'Bookmark'}
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={() => setShowNotesPanel((v) => !v)}
            aria-expanded={showNotesPanel}
          >
            <AppIcon name="edit_note" size={18} />
            My Notes
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={handleQuizFromPaper}
          >
            <AppIcon name="quiz" size={18} />
            Quiz From This Paper
          </button>

          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={toggleAll}
            disabled={loading || questions.length === 0}
          >
            <AppIcon name={allExpanded ? 'visibility_off' : 'visibility'} size={18} />
            {allExpanded ? 'Hide all answers' : 'Show all answers'}
          </button>

          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
          >
            <AppIcon name="download" size={18} />
            Download / Print
          </button>
        </div>
      </div>

      <p className="paperview-shortcuts-hint" aria-label="Reading keyboard shortcuts">
        Shortcuts: <kbd>J</kbd>/<kbd>K</kbd> next or previous question, <kbd>E</kbd> expand answers, <kbd>B</kbd> bookmark, <kbd>N</kbd> notes
      </p>

      {/* Personal Notes Drawer */}
      {showNotesPanel && (
        <section
          aria-label="Personal study notes for this paper"
          className="paperview-notes-card"
        >
          <div className="paperview-notes-head">
            <strong className="paperview-notes-title">
              Personal Study Notes: {paper.title}
            </strong>
            <span className="paperview-notes-meta">Saved privately on your device</span>
          </div>
          <textarea
            aria-label={`Personal study notes for ${paper.title}`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Jot down key formulas, tricky concepts, or questions to revise from this paper…"
            rows={3}
            className="paperview-notes-textarea"
          />
          <div className="paperview-notes-actions">
            <button type="button" className="paperview-btn-secondary" onClick={handleSaveNote}>
              <AppIcon name="save" size={18} />
              Save Note
            </button>
          </div>
        </section>
      )}

      {/* Exam sheet */}
      <div className="paperview-exam-sheet" style={{ '--paper-zoom': zoomScale }}>
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
                  ? (
                    <>
                      {' ('}
                      <span className="mono-code" translate="no">{paper.subjectCode}</span>
                      {')'}
                    </>
                  )
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

          {(isSamplePaper || usesCuratedQuestions) && (
            <div className="paperview-provenance" role="note">
              <AppIcon name="info" size={20} />
              <div>
                {isSamplePaper && (
                  <p>
                    <strong>Sample practice paper.</strong> This set is generated for practice and is
                    not an official COMSATS examination.
                  </p>
                )}
                {usesCuratedQuestions && (
                  <p>
                    <strong>Curated practice questions.</strong> These questions come from the practice
                    bank and are not taken from this specific examination paper.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Safe PDF embed */}
        {safeFileUrl && (
          <div className="paperview-pdf-frame-wrap">
            <iframe
              src={safeFileUrl}
              title={paper.title || 'Past examination paper PDF'}
              width="100%"
              height="500px"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              className="paperview-pdf-frame"
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
              <span className="paperview-question-count tabular-nums">
                {questions.length}{' '}
                {questions.length === 1 ? 'question' : 'questions'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="paperview-questions-skeleton" aria-busy="true">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : error ? (
            <div role="alert" className="paperview-questions-state">
              <p>{error}</p>
              <button
                type="button"
                className="paperview-btn-secondary paperview-retry-btn"
                onClick={() => setReloadKey((v) => v + 1)}
              >
                Try again
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="paperview-questions-state">
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
                      <AppIcon name={isExpanded ? 'expand_less' : 'lightbulb'} size={18} />
                      {isExpanded ? 'Hide model answer' : 'View model answer'}
                      <AppIcon name={isExpanded ? 'remove' : 'add'} size={18} />
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
                      <AppIcon name="school" size={20} />
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
          <div className="paperview-guest-cta">
            <div className="paperview-guest-icon">
              <AppIcon name="lock_open" size={40} />
            </div>
            <h3 className="paperview-guest-title">
              Sign in for free to unlock all {questions.length} questions &amp; solutions
            </h3>
            <p className="paperview-guest-copy">
              You are viewing a 2-question guest preview. Sign in to view the complete exam paper, save personal notes, and bookmark papers across devices.
            </p>
            <button type="button" className="btn-download" onClick={onRequireAuth}>
              <AppIcon name="login" size={18} />
              Sign In to Unlock Full Paper
            </button>
          </div>
        )}

        {/* Download & Report Problem Footer */}
        <div className="paperview-download-footer">
          <div className="paperview-footer-row">
            <div>
              <h4 className="paperview-footer-title">
                Need an offline copy or spotted a typo?
              </h4>
              <p className="paperview-footer-copy">
                Download or print this paper with its model answers, or report an error for moderator review.
              </p>
            </div>

            <div className="paperview-footer-actions">
              <button
                type="button"
                className="paperview-btn-secondary"
                onClick={() => setReportModalOpen(true)}
              >
                <AppIcon name="flag" size={18} />
                Report a problem
              </button>
              <button type="button" className="btn-download" onClick={handleDownload}>
                <AppIcon name="download" size={18} />
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
          <p className="paperview-report-copy">
            Let us know if a question is unclear, a model answer has an error, or a PDF link is broken for <strong>{paper.title}</strong>.
          </p>
          <textarea
            aria-label="Describe the problem with this paper"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Describe the issue (e.g., Question 2 option B formula typo)…"
            rows={4}
            required
            className="paperview-report-textarea"
          />
          <div className="paperview-report-actions">
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
