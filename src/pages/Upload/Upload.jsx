import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import AppIcon from '../../components/ui/AppIcon';
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

    setTimeout(async () => {
      const { sync } = addModerationSubmission({
        type: activeTab,
        subjectCode: subjectCode.trim(),
        title: `${subjectCode.trim()} - ${examType.trim()}`,
        contributor: uploaderName.trim() || 'Student Contributor',
        details: activeTab === 'upload' ? selectedFile?.name : requestDetails.trim()
      });
      const result = await sync;
      setSubmitting(false);
      if (!result.ok) {
        toast.error(
          'We could not reach the server, so this was saved on your device only. Please retry before closing the page.'
        );
        return;
      }
      setSubmitted(true);
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

  const handleTabKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    const current = tabs.indexOf(e.target.closest('[role="tab"]'));
    const direction = e.key === 'ArrowLeft' ? -1 : 1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + direction + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <div className="upload-container">
      <PageHeader
        badge="Contribute & Request"
        title="Upload or Request a Past Paper"
        subtitle="Help fellow COMSATS students by uploading exam papers (reviewed by moderators before publishing) or requesting a paper you need."
      />

      {/* Mode Switcher */}
      <div className="upload-tabs" role="tablist" aria-label="Paper contribution mode" onKeyDown={handleTabKeyDown}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          id="upload-tab-upload"
          aria-controls="upload-panel"
          tabIndex={activeTab === 'upload' ? 0 : -1}
          onClick={() => { setActiveTab('upload'); setSubmitted(false); }}
          className={`upload-tab-btn${activeTab === 'upload' ? ' upload-tab-btn--active' : ''}`}
        >
          <AppIcon name="upload_file" size={18} />
          Upload Past Paper
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'request'}
          id="upload-tab-request"
          aria-controls="upload-panel"
          tabIndex={activeTab === 'request' ? 0 : -1}
          onClick={() => { setActiveTab('request'); setSubmitted(false); }}
          className={`upload-tab-btn${activeTab === 'request' ? ' upload-tab-btn--active' : ''}`}
        >
          <AppIcon name="campaign" size={18} />
          Request a Missing Paper
        </button>
      </div>

      <div className="upload-card" id="upload-panel" role="tabpanel" aria-labelledby={`upload-tab-${activeTab}`} tabIndex={0}>
        {submitted ? (
          <div className="upload-success">
            <div className="upload-success-icon">
              <AppIcon name="check_circle" size={40} />
            </div>
            <h3 className="upload-success-title">
              Thank You, {uploaderName || 'Contributor'}
            </h3>
            <p className="upload-success-text">
              Your {activeTab === 'upload' ? 'upload' : 'paper request'} for <strong>{subjectCode || 'Past Paper'}</strong> has been placed in the moderation queue.
              Approved papers are published after verification.
            </p>
            <button
              type="button"
              className="btn-primary-pill upload-reset-btn"
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
                  className={`upload-dropzone upload-dropzone--label${dragOver ? ' drag-over' : ''}${selectedFile ? ' has-file' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    id="paper-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={handleFileInputChange}
                    aria-label="Choose past paper file"
                    aria-invalid={Boolean(fileError)}
                    aria-describedby={fileError ? 'upload-file-error' : undefined}
                  />
                  <div className="upload-dropzone-icon">
                    <AppIcon name={selectedFile ? 'description' : 'cloud_upload'} size={36} />
                  </div>
                  {selectedFile ? (
                    <>
                      <div className="upload-dropzone-title upload-dropzone-title--selected">
                        {selectedFile.name}
                      </div>
                      <div className="upload-dropzone-hint">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-dropzone-title">Drag &amp; drop your paper file here</div>
                      <div className="upload-dropzone-hint">Supports PDF, PNG, JPG, up to 15MB (Moderation required before publishing)</div>
                    </>
                  )}
                </label>

                {fileError && (
                  <div id="upload-file-error" role="alert" className="upload-file-error">
                    <AppIcon name="error" size={18} />
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
                placeholder="e.g. CSC211 - Data Structures & Algorithms"
                value={subjectCode}
                spellCheck={false}
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
                placeholder="e.g. Terminal Examination, Fall 2024"
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
                  <AppIcon name="progress_activity" size={18} className="upload-submit-spinner" />
                  Submitting…
                </>
              ) : (
                <>
                  <AppIcon name={activeTab === 'upload' ? 'upload' : 'campaign'} size={18} />
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
