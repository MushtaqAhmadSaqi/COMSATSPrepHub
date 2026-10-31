import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  getDailyChallengeStatus,
  recordDailyChallengeCompletion,
  getFlashcardsQueue,
  reviewFlashcard,
  getExamCountdowns,
  saveExamCountdowns
} from '../../utils/studyTracker';
import { toast } from '../../utils/toast';

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
    q: 'What is the standard format for representing time complexities?',
    options: ['Omega Notation', 'Big-O Notation', 'Theta Notation', 'Alpha Notation'],
    answer: 1,
    explanation: 'Big-O notation describes the worst-case upper bound of an algorithm.'
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
    }, 1200);
  };

  const handleFlashcardRating = (rating) => {
    if (!currentCard) return;
    reviewFlashcard(currentCard.id, rating);
    setFlipped(false);
    if (cardIndex + 1 < cards.length) {
      setCardIndex((i) => i + 1);
    } else {
      setCards(getFlashcardsQueue());
      setCardIndex(0);
      toast.success('Completed flashcard batch!');
    }
  };

  return (
    <div style={{ maxWidth: '56rem', margin: '2rem auto', padding: '0 1rem', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand)' }}>Student Study Hub</h1>
        <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>
          Daily 5-Question Challenges, Spaced-Repetition Flashcards &amp; Exam Countdown.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`nav-link-btn ${activeTab === 'daily' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>local_fire_department</span>
          Daily Challenge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`nav-link-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>style</span>
          Flashcards
        </button>
      </div>

      {activeTab === 'daily' && (
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2)' }}>
          {challengeStatus.completedToday && !isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>check_circle</span>
              <h2 style={{ margin: '1rem 0 0.5rem' }}>You completed today's challenge!</h2>
              <p style={{ color: 'var(--text-subtle)' }}>
                Today's Score: <strong>{challengeStatus.todayScore} / 5</strong> | Current Streak: <strong>{challengeStatus.streak || 1} days 🔥</strong>
              </p>
            </div>
          ) : isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>emoji_events</span>
              <h2 style={{ margin: '1rem 0 0.5rem' }}>Challenge Finished!</h2>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '1.5rem' }}>
                You scored <strong>{score}</strong> out of {SAMPLE_DAILY_QUESTIONS.length}.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand)' }}>
                  Question {qIndex + 1} of {SAMPLE_DAILY_QUESTIONS.length}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-subtle)' }}>
                  Score: {score}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{currentQ.q}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options.map((opt, idx) => {
                  let bg = 'var(--surface-2)';
                  let color = 'var(--text)';
                  if (selectedOpt !== null) {
                    if (idx === currentQ.answer) {
                      bg = '#10b981';
                      color = '#ffffff';
                    } else if (idx === selectedOpt) {
                      bg = '#ef4444';
                      color = '#ffffff';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOpt !== null}
                      onClick={() => handleOptionSelect(idx)}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: bg,
                        color,
                        textAlign: 'left',
                        cursor: selectedOpt !== null ? 'default' : 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-2)' }}>
          {currentCard ? (
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--brand)', fontWeight: 700, marginBottom: '0.5rem' }}>
                {currentCard.subjectCode} — Card {cardIndex + 1} of {cards.length}
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped(!flipped)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFlipped(!flipped); }}
                style={{
                  minHeight: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  margin: '1.5rem 0',
                  border: '1px solid var(--border-strong)'
                }}
              >
                <p style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                  {flipped ? currentCard.back : currentCard.front}
                </p>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '1.5rem' }}>
                (Click the card to flip)
              </p>
              {flipped && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleFlashcardRating('hard')}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Hard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlashcardRating('good')}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '9999px', border: 'none', color: '#ffffff', background: 'var(--brand)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlashcardRating('easy')}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '1px solid #10b981', color: '#10b981', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Easy
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>No flashcards due right now!</p>
          )}
        </div>
      )}
    </div>
  );
}

