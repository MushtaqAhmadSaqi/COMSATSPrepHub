import React, { useState, useRef } from 'react';
import { addModerationSubmission } from '../../utils/studyTracker';
import { toast } from '../../utils/toast';
import AppIcon from '../../components/ui/AppIcon';
import './FaqContact.css';

const FAQS = [
  {
    q: 'Are the past papers on COMSATSPrepHub verified?',
    a: 'Yes, all past examination papers and model answer keys are contributed by university high-scorers and verified before publishing.'
  },
  {
    q: 'How does the SGPA/CGPA calculator work?',
    a: 'Our GPA calculator adheres strictly to the official COMSATS University grading formula and credit-hour weightages, including handling retakes.'
  },
  {
    q: 'Can I use COMSATSPrepHub without creating an account?',
    a: 'Yes! Guest students can browse past papers, practice quizzes, and use the GPA calculator. Signing in syncs your activity feed across devices; bookmarks, notes, and flashcards stay in this browser.'
  },
  {
    q: 'How do I contribute a past paper or solution?',
    a: 'Navigate to the Upload page from the top navigation or footer. You can submit PDF scans or clear images of past midterms and finals.'
  }
];

export default function FaqContact() {
  const [openIdx, setOpenIdx] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!name || !email || !message) {
      toast.error('Please fill in all fields.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { sync } = addModerationSubmission({
        type: 'contact',
        subjectCode: 'SUPPORT',
        title: `Support Inquiry from ${name.trim()}`,
        contributor: `${name.trim()} (${email.trim()})`,
        details: message.trim()
      });
      const result = await sync;
      if (result.ok) {
        setSent(true);
        toast.success('Your message was submitted to the student team queue.');
      } else {
        toast.error(
          'We could not reach the server, so your message is only saved in this browser. Please retry or email us directly.'
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="faq-container">
      <div className="faq-header">
        <h1 className="faq-title">FAQ &amp; Contact Us</h1>
        <p className="faq-subtitle">
          Have questions or want to reach out to the COMSATSPrepHub team?
        </p>
      </div>

      <section className="faq-section">
        <h2 className="faq-section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                aria-controls={`faq-answer-${i}`}
                className="faq-toggle-btn"
              >
                <span>{faq.q}</span>
                <AppIcon name="expand_more" size={20} className={`faq-chevron${openIdx === i ? ' faq-chevron--open' : ''}`} />
              </button>
              {openIdx === i && (
                <div id={`faq-answer-${i}`} className="faq-answer">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="contact-card">
        <h2 className="contact-heading">Contact the Student Team</h2>
        <p className="contact-subtitle">
          Need help or want to report an issue? Send us a quick note.
        </p>

        {sent ? (
          <div className="contact-success">
            <AppIcon name="check_circle" size={48} className="contact-success-icon" />
            <h3 className="contact-success-title">Thank you!</h3>
            <p className="contact-success-desc">Your message is in the support queue. You can also email us using the links in the footer.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={submitting} className="contact-form">
            <div>
              <label htmlFor="contact-name" className="contact-label">Name</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="contact-input"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="contact-label">Email</label>
              <input
                id="contact-email"
                type="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@comsats.edu.pk"
                className="contact-input"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="contact-label">Message</label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="How can we help?"
                className="contact-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="contact-submit-btn"
            >
              {submitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

