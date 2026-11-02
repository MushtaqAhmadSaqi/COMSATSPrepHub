import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  getDailyChallengeStatus,
  recordDailyChallengeCompletion,
  getFlashcardsQueue,
  reviewFlashcard,
  addCustomFlashcard
} from '../../utils/studyTracker';
import { toast } from '../../utils/toast';
import './StudyHub.css';

const SAMPLE_DAILY_QUESTIONS = [
  {
    q: 'In OOP, which principle promotes code reuse and hierarchical classification?',
    options: ['Polymorphism', 'Encapsulation', 'Inheritance', 'Abstraction'],
    answer: 2,
    explanation: 'Inheritance allows a new class to inherit attributes and methods from an existing class.'
  },
  {
    q: 'What is the time complexity of searching in a balanced Binary Search Tree (AVL)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    answer: 1,
    explanation: 'Balanced BST operations take logarithmic time O(log n).'
  },
  {
    q: 'Which layer of the OSI model is responsible for routing packets across networks?',
    options: ['Data Link', 'Transport', 'Network', 'Session'],
    answer: 2,
    explanation: 'The Network layer (Layer 3) handles packet forwarding and routing (e.g. IP).'
  },
  {
    q: 'In Database Management Systems, what does ACID stand for?',
    options: [
      'Atomicity, Consistency, Isolation, Durability',
      'Accuracy, Concurrency, Integrity, Durability',
      'Atomicity, Concurrency, Isolation, Dependency',
      'Access, Consistency, Indexing, Durability'
    ],
    answer: 0,
    explanation: 'ACID guarantees database transaction reliability.'
  },
  {
    q: 'What is the standard format for representing worst-case upper bound time complexities?',
    options: ['Omega Notation', 'Big-O Notation', 'Theta Notation', 'Alpha Notation'],
    answer: 1,
    explanation: 'Big-O notation describes the asymptotic upper bound of an algorithm.'
  }
];

const HIGH_YIELD_CHEATSHEETS = [
  {
    code: 'CSC211',
    title: 'Data Structures & Algorithms',
    points: [
      'AVL Tree Balance Factor: BF = height(left) - height(right) ∈ {-1, 0, +1}',
      'QuickSort: Avg O(n log n), Worst O(n²) on sorted pivot; MergeSort: Guaranteed O(n log n)',
      'BFS uses a Queue (Level-order); DFS uses a Stack / Recursion',
      'Hash Table Open Addressing: Linear Probing (primary clustering) vs Double Hashing'
    ]
  },
  {
    code: 'CSC371',
    title: 'Database Systems (SQL & Normalization)',
    points: [
      '1NF: Atomic values; 2NF: No partial dependency on composite PK',
      '3NF: No transitive dependency (non-key → non-key); BCNF: Every determinant is a candidate key',
      'SQL Execution Order: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
      'ACID: Atomicity (all/nothing), Consistency, Isolation, Durability'
    ]
  },
  {
    code: 'CSC322',
    title: 'Operating Systems',
    points: [
      '4 Coffman Deadlock Conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait',
      'SJF / SRTF minimizes average waiting time; Round Robin optimizes response time',
      'Paging eliminates external fragmentation; Segmentation matches logical user view',
      'Banker’s Algorithm checks if a safe sequence exists before granting resource requests'
    ]
  },
  {
    code: 'MTH104',
    title: 'Calculus & Analytical Geometry',
    points: [
      'Fundamental Limit: lim(x→0) [sin(x)/x] = 1; lim(x→0) [(1-cos x)/x] = 0',
      'Integration by Parts: ∫ u dv = u·v - ∫ v du (LIATE rule for choosing u)',
      'Critical Points: f′(c) = 0 or undefined; f″(c) > 0 → Local Min, f″(c) < 0 → Local Max',
      'L’Hôpital’s Rule applies strictly to 0/0 or ∞/∞ indeterminate forms'
    ]
  }
];

export default function StudyHub() {
  const [activeTab, setActiveTab] = useState('daily');
  const [challengeStatus, setChallengeStatus] = useState(() => getDailyChallengeStatus());
  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Flashcards state
  const [cards, setCards] = useState(() => getFlashcardsQueue());
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newCourse, setNewCourse] = useState('CSC211');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const currentQ = SAMPLE_DAILY_QUESTIONS[qIndex];
  const currentCard = cards[cardIndex];

  const handleOptionSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    const isCorrect = idx === currentQ.answer;
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      if (qIndex + 1 < SAMPLE_DAILY_QUESTIONS.length) {
        setQIndex((i) => i + 1);
        setSelectedOpt(null);
      } else {
        const finalScore = score + (isCorrect ? 1 : 0);
        setIsFinished(true);
        recordDailyChallengeCompletion(finalScore, SAMPLE_DAILY_QUESTIONS.length);
        setChallengeStatus(getDailyChallengeStatus());
        toast.success(`Daily challenge completed! Score: ${finalScore}/${SAMPLE_DAILY_QUESTIONS.length}`);
      }
    }, 1100);
  };

  const handleFlashcardRating = (rating) => {
    if (!currentCard) return;
    const updated = reviewFlashcard(currentCard.id, rating);
    setCards(updated);
    setFlipped(false);
    if (cardIndex + 1 < updated.length) {
      setCardIndex((i) => i + 1);
    } else {
      setCardIndex(0);
      toast.success('Completed flashcard review round!');
    }
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) {
      toast.error('Please enter both a question (front) and answer (back).');
      return;
    }
    const updated = addCustomFlashcard({
      subjectCode: newCourse,
      front: newFront,
      back: newBack
    });
    setCards(updated);
    setCardIndex(0);
    setFlipped(false);
    setNewFront('');
    setNewBack('');
    toast.success('Added custom flashcard to Box 1!');
  };

  return (
    <div className="study-hub-container">
      <PageHeader
        badge="Active Recall Workspace"
        title="Student Study Hub"
        subtitle="Build daily consistency with the 5-Question Challenge, Leitner spaced-repetition flashcards, and high-yield COMSATS course cheat-sheets."
        align="center"
      />

      <div className="study-hub-tabs" role="tablist" aria-label="Study Hub sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'daily'}
          onClick={() => setActiveTab('daily')}
          className={`study-hub-tab ${activeTab === 'daily' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">local_fire_department</span>
          Daily 5-Q Challenge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'flashcards'}
          onClick={() => setActiveTab('flashcards')}
          className={`study-hub-tab ${activeTab === 'flashcards' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">style</span>
          Leitner Flashcards ({cards.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cheatsheets'}
          onClick={() => setActiveTab('cheatsheets')}
          className={`study-hub-tab ${activeTab === 'cheatsheets' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">menu_book</span>
          Course Cheat-Sheets
        </button>
      </div>

      {activeTab === 'daily' && (
        <div className="study-hub-card">
          {challengeStatus.completedToday && !isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3.25rem', color: 'var(--success)' }} aria-hidden="true">check_circle</span>
              <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>You completed today&apos;s challenge!</h2>
              <p style={{ color: 'var(--text-subtle)' }}>
                Today&apos;s Score: <strong>{challengeStatus.todayScore}</strong> · Current Streak: <strong>{challengeStatus.dailyStreak || 1} days 🔥</strong>
              </p>
            </div>
          ) : isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3.25rem', color: 'var(--success)' }} aria-hidden="true">emoji_events</span>
              <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Challenge Finished!</h2>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }}>
                You scored <strong>{score}</strong> out of {SAMPLE_DAILY_QUESTIONS.length}. Come back tomorrow to grow your streak!
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="leitner-badge">
                  Question {qIndex + 1} of {SAMPLE_DAILY_QUESTIONS.length}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-subtle)' }}>
                  Score: {score}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>{currentQ.q}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options.map((opt, idx) => {
                  let bg = 'var(--surface-2)';
                  let color = 'var(--text)';
                  let borderColor = 'var(--border)';
                  if (selectedOpt !== null) {
                    if (idx === currentQ.answer) {
                      bg = 'var(--success)';
                      color = '#ffffff';
                      borderColor = 'var(--success)';
                    } else if (idx === selectedOpt) {
                      bg = 'var(--danger)';
                      color = '#ffffff';
                      borderColor = 'var(--danger)';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOpt !== null}
                      onClick={() => handleOptionSelect(idx)}
                      style={{
                        minHeight: '48px',
                        padding: '0.875rem 1.125rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${borderColor}`,
                        background: bg,
                        color,
                        textAlign: 'left',
                        cursor: selectedOpt !== null ? 'default' : 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {selectedOpt !== null && (
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }} role="status">
                  💡 {currentQ.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div className="study-hub-card">
          {currentCard ? (
            <div>
              <div className="flashcard-meta-row">
                <span className="leitner-badge">
                  {currentCard.subjectCode} · Card {cardIndex + 1} of {cards.length}
                </span>
                <span className="leitner-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }} aria-hidden="true">inventory_2</span>
                  Leitner Box {currentCard.box || 1} / 5
                </span>
              </div>

              <div className="flashcard-stage">
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={flipped}
                  aria-label={flipped ? 'Flashcard answer shown. Activate to flip to question.' : 'Flashcard question shown. Activate to reveal answer.'}
                  onClick={() => setFlipped(!flipped)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFlipped(!flipped);
                    }
                  }}
                  className={`flashcard-box ${flipped ? 'is-flipped' : ''}`}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginBottom: '0.6rem' }}>
                    {flipped ? 'Model Answer (Back)' : 'Prompt (Front) — Click or Press Space to Flip'}
                  </span>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.55, maxWidth: '42rem' }}>
                    {flipped ? currentCard.back : currentCard.front}
                  </p>
                </div>
              </div>

              {flipped && (
                <div className="flashcard-rating-row" role="group" aria-label="Rate flashcard recall difficulty">
                  <button
                    type="button"
                    className="flashcard-rate-btn"
                    onClick={() => handleFlashcardRating('again')}
                    style={{ border: '1.5px solid var(--danger)', color: 'var(--danger)', background: 'var(--danger-soft)' }}
                  >
                    Again (Reset to Box 1)
                  </button>
                  <button
                    type="button"
                    className="flashcard-rate-btn"
                    onClick={() => handleFlashcardRating('hard')}
                    style={{ border: '1.5px solid var(--warning)', color: 'var(--warning)', background: 'var(--warning-soft)' }}
                  >
                    Hard (10m)
                  </button>
                  <button
                    type="button"
                    className="flashcard-rate-btn"
                    onClick={() => handleFlashcardRating('good')}
                    style={{ border: 'none', color: '#ffffff', background: 'var(--brand)' }}
                  >
                    Good (+1 Box)
                  </button>
                  <button
                    type="button"
                    className="flashcard-rate-btn"
                    onClick={() => handleFlashcardRating('easy')}
                    style={{ border: '1.5px solid var(--success)', color: 'var(--success)', background: 'var(--success-soft)' }}
                  >
                    Easy (3d)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center' }}>No flashcards in queue.</p>
          )}

          {/* Create Custom Flashcard */}
          <form onSubmit={handleAddCard} style={{ marginTop: '2.25rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.875rem' }}>
              + Add Your Own Study Flashcard
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="ai-input"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="Course code (e.g. CSC211)"
                aria-label="Flashcard course code"
                maxLength={12}
              />
              <input
                type="text"
                className="ai-input"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Front: Question or theorem…"
                aria-label="Flashcard front question"
                maxLength={300}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="ai-input"
                style={{ flex: 1, minWidth: '220px' }}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Back: Concise answer or formula…"
                aria-label="Flashcard back answer"
                maxLength={600}
              />
              <button
                type="submit"
                style={{
                  minHeight: '44px',
                  padding: '0.65rem 1.35rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Add Flashcard
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'cheatsheets' && (
        <div className="study-hub-card">
          <div className="cheatsheet-grid">
            {HIGH_YIELD_CHEATSHEETS.map((sheet) => (
              <article key={sheet.code} className="cheatsheet-item">
                <span className="leitner-badge">{sheet.code}</span>
                <h3>{sheet.title}</h3>
                <ul>
                  {sheet.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
