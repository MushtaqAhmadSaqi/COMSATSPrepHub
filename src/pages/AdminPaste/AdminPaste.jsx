import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AdminPaste.css';

export default function AdminPaste() {
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleParse = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setParsedItems([]);

    const trimmed = rawText.trim();
    if (!trimmed) {
      setErrorMsg('Please paste raw JSON or question text before parsing.');
      return;
    }

    try {
      const asJson = JSON.parse(trimmed);
      const list = Array.isArray(asJson) ? asJson : asJson.questions || [asJson];
      setParsedItems(list);
    } catch {
      // Fallback: split by numbered questions or double newlines
      const blocks = trimmed
        .split(/\n\s*\n+/)
        .map((b) => b.trim())
        .filter(Boolean)
        .map((block, idx) => ({
          questionNumber: idx + 1,
          questionText: block
        }));

      if (blocks.length === 0) {
        setErrorMsg('Could not extract any questions from the provided input.');
        return;
      }
      setParsedItems(blocks);
    }
  };

  return (
    <div className="admin-paste-container">
      <PageHeader
        badge="Admin Workspace"
        title="Admin Raw Paper Parser"
        subtitle="Paste raw markdown or JSON past paper content to validate, structure, and preview before database import."
      />

      <form className="admin-paste-card" onSubmit={handleParse}>
        <label className="ai-label" htmlFor="admin-raw-paper-textarea">
          Raw Paper Content (JSON or Question Blocks)
        </label>
        <textarea
          id="admin-raw-paper-textarea"
          className="admin-textarea"
          placeholder="Paste raw paper text or JSON array here..."
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          required
        />

        <button type="submit" className="btn-generate-ai">
          <span className="material-symbols-outlined" aria-hidden="true">data_object</span>
          Parse & Validate Raw Data
        </button>

        {errorMsg && (
          <p role="alert" style={{ marginTop: '1.25rem', fontWeight: 700, color: 'var(--danger)', textAlign: 'center' }}>
            {errorMsg}
          </p>
        )}

        {parsedItems.length > 0 && (
          <div style={{ marginTop: '1.5rem' }} role="status">
            <p style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem' }}>
              Parsed {parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'} successfully! Ready for verification.
            </p>
            <pre
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.8125rem',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              {JSON.stringify(parsedItems, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
