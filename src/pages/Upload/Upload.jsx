import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { fireConfetti } from '../../utils/confetti';
import { addModerationSubmission } from '../../utils/studyTracker';
import { useToast } from '../../utils/toast';
import './Upload.css';

export default function Upload() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'request'
  const [submitted, setSubmitted] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [examType, setExamType] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const toast = useToast();
  const MAX_SIZE_MB = 15;

  const validateAndSetFile = (file) => {
    setFileError('');
    if (!file) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      setFileError('Only PDF, PNG, or JPG files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(
        `File must be under ${MAX_SIZE_MB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      );
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'upload' && !selectedFile) {
      setFileError('Please select a file to upload.');
      return;
    }
    if (!subjectCode.trim() || !examType.trim()) {
      setFieldErrors({
        subjectCode: !subjectCode.trim() ? 'This field is required' : undefined,
        examType: !examType.trim() ? 'This field is required' : undefined
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    setTimeout(() => {
      addModerationSubmission({
        type: activeTab,
        subjectCode: subjectCode.trim(),
        title: `${subjectCode.trim()} — ${examType.trim()}`,
        contributor: uploaderName.trim() || 'Student Contributor',
        details: activeTab === 'upload' ? selectedFile?.name : requestDetails.trim()
      });
      setSubmitted(true);
      setSubmitting(false);
      toast.success(
        activeTab === 'upload'
          ? 'Paper submitted to moderation queue!'
          : 'Paper request submitted to community queue!'
      );
      fireConfetti({ count: 90, spread: 80 });
    }, 450);
  };

  const validateFieldOnBlur = (field, value) => {
    const errs = { ...fieldErrors };
    if (!value.trim()) {
      errs[field] = 'This field is required';
    } else {
      delete errs[field];
    }
    setFieldErrors(errs);
  };

  return (
    <div className="upload-container">
      <PageHeader
        badge="Contribute & Request"
        title="Upload or Request a Past Paper"
        subtitle="Help fellow COMSATS students by uploading exam papers (reviewed by moderators before publishing) or requesting a paper you need."
      />

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          onClick={() => { setActiveTab('upload'); setSubmitted(false); }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '9999px',
            border: '1.5px solid var(--border)',
            background: activeTab === 'upload' ? 'var(--brand)' : 'var(--surface)',
            color: activeTab === 'upload' ? '#ffffff' : 'var(--text)',
            fontWeight: 700,
            fontSize: '0.875rem',
            minHeight: '44px'
          }}
        >
          📤 Upload Past Paper
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'request'}
          onClick={() => { setActiveTab('request'); setSubmitted(false); }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '9999px',
            border: '1.5px solid var(--border)',
            background: activeTab === 'request' ? 'var(--brand)' : 'var(--surface)',
            color: activeTab === 'request' ? '#ffffff' : 'var(--text)',
            fontWeight: 700,
            fontSize: '0.875rem',
            minHeight: '44px'
          }}
        >
          🙋 Request a Missing Paper
        </button>
      </div>

      <div className="upload-card">
        {submitted ? (
          <div className="upload-success">
            <div className="upload-success-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check_circle</span>
            </div>
            <h3 className="upload-success-title">
              Thank You, {uploaderName || 'Contributor'}! 🎉
            </h3>
            <p className="upload-success-text">
              Your {activeTab === 'upload' ? 'upload' : 'paper request'} for <strong>{subjectCode || 'Past Paper'}</strong> has been placed in the moderation queue.
              Approved papers are published after verification.
            </p>
            <button
              type="button"
              className="btn-primary-pill"
              style={{ margin: '1.5rem auto 0 auto' }}
              onClick={() => {
                setSubmitted(false);
                setSubjectCode('');
                setExamType('');
                setRequestDetails('');
                setSelectedFile(null);
                setFileError('');
              }}
            >
              Submit Another {activeTab === 'upload' ? 'Paper' : 'Request'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {activeTab === 'upload' && (
              <>
                <label
                  htmlFor="paper-file-input"
                  className={`upload-dropzone${dragOver ? ' drag-over' : ''}${selectedFile ? ' has-file' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{ cursor: 'pointer', display: 'block' }}
                >
                  <input
                    id="paper-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                    aria-label="Choose past paper file"
                  />
                  <div className="upload-dropzone-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>
                      {selectedFile ? 'description' : 'cloud_upload'}
                    </span>
                  </div>
                  {selectedFile ? (
                    <>
                      <div className="upload-dropzone-title" style={{ color: 'var(--brand)' }}>
                        {selectedFile.name}
                      </div>
                      <div className="upload-dropzone-hint">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-dropzone-title">Drag &amp; drop your paper file here</div>
                      <div className="upload-dropzone-hint">Supports PDF, PNG, JPG — up to 15MB (Moderation required before publishing)</div>
                    </>
                  )}
                </label>

                {fileError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                    {fileError}
                  </div>
                )}
              </>
            )}

            <div className="ai-field">
              <label className="ai-label" htmlFor="upload-subject-code">Subject Code / Name</label>
              <input
                id="upload-subject-code"
                type="text"
                className={`ai-input${fieldErrors.subjectCode ? ' auth-input--error' : ''}`}
                placeholder="e.g. CSC211 — Data Structures & Algorithms"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                onBlur={(e) => validateFieldOnBlur('subjectCode', e.target.value)}
                required
              />
              {fieldErrors.subjectCode && <span className="auth-field-error">{fieldErrors.subjectCode}</span>}
            </div>

            <div className="ai-field">
              <label className="ai-label" htmlFor="upload-exam-type">Exam Type, Semester &amp; Year</label>
              <input
                id="upload-exam-type"
                type="text"
                className={`ai-input${fieldErrors.examType ? ' auth-input--error' : ''}`}
                placeholder="e.g. Terminal Examination — Fall 2024"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                onBlur={(e) => validateFieldOnBlur('examType', e.target.value)}
                required
              />
              {fieldErrors.examType && <span className="auth-field-error">{fieldErrors.examType}</span>}
            </div>

            {activeTab === 'request' && (
              <div className="ai-field">
                <label className="ai-label" htmlFor="upload-request-details">Additional Details (Campus / Instructor)</label>
                <input
                  id="upload-request-details"
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Islamabad Campus, Spring 2024 Midterm with solutions"
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                />
              </div>
            )}

            <div className="ai-field">
              <label className="ai-label" htmlFor="upload-uploader-name">Your Name (Optional)</label>
              <input
                id="upload-uploader-name"
                type="text"
                className="ai-input"
                placeholder="Your name for contributor credit"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-generate-ai" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '18px' }}>progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">{activeTab === 'upload' ? 'upload' : 'campaign'}</span>
                  {activeTab === 'upload' ? 'Submit Paper for Moderation' : 'Submit Paper Request'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
