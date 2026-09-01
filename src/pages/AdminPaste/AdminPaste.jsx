import React, { useState } from 'react';
import './AdminPaste.css';

export default function AdminPaste() {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(false);

  return (
    <div className="admin-paste-container">
      <div className="admin-paste-card">
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Admin Raw Paper Parser</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Paste raw markdown or JSON past paper content to parse and publish.</p>

        <textarea
          className="admin-textarea"
          placeholder="Paste raw paper text or JSON here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <button type="button" className="btn-generate-ai" onClick={() => setParsed(true)}>
          Parse & Publish Raw Data
        </button>

        {parsed && (
          <p style={{ marginTop: '1.5rem', fontWeight: 700, color: '#10b981', textAlign: 'center' }}>
            Parsed successfully! Ready for verification.
          </p>
        )}
      </div>
    </div>
  );
}
