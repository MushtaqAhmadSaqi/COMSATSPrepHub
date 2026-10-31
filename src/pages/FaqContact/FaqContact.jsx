import React, { useState } from 'react';
import { toast } from '../../utils/toast';

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
    a: 'Yes! Guest students can browse past papers, practice quizzes, and use the GPA calculator. Signing in enables cross-device sync, bookmarks, and streak tracking.'
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in all fields.');
      return;
    }
    setSent(true);
    toast.success('Your message has been sent to the student team!');
  };

  return (
    <div style={{ maxWidth: '48rem', margin: '2rem auto', padding: '0 1rem', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand)' }}>FAQ &amp; Contact Us</h1>
        <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>
          Have questions or want to reach out to the COMSATSPrepHub team?
        </p>
      </div>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-1)'
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text)'
                }}
              >
                <span>{faq.q}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', transition: 'transform 0.2s', transform: openIdx === i ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>
              {openIdx === i && (
                <div style={{ padding: '0 1.25rem 1.25rem', color: 'var(--text-subtle)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Contact the Student Team</h2>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Need help or want to report an issue? Send us a quick note.
        </p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>check_circle</span>
            <h3 style={{ margin: '0.5rem 0' }}>Thank you!</h3>
            <p style={{ color: 'var(--text-subtle)' }}>We have received your message and will get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@comsats.edu.pk"
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="How can we help?"
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }}
                required
              />
            </div>
            <button
              type="submit"
              style={{
                alignSelf: 'flex-start',
                padding: '0.625rem 1.5rem',
                borderRadius: '9999px',
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Send Message
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

