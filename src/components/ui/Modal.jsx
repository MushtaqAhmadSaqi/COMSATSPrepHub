import React, { useEffect, useRef } from 'react';
import AppIcon from './AppIcon';
import './Modal.css';

/**
 * Generic accessible Modal dialog component built on native Top-Layer <dialog>.
 */
export default function Modal({
  isOpen = false,
  onClose = () => {},
  title = '',
  children
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
      const focusTimer = requestAnimationFrame(() => {
        const focusables = dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables && focusables.length > 0) {
          focusables[0].focus();
        }
      });
      return () => cancelAnimationFrame(focusTimer);
    }

    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
    return undefined;
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="native-dialog ui-modal-dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="ui-modal-panel">
        <div className="ui-modal-header">
          {title && (
            <h3 id="modal-title" className="ui-modal-title">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ui-modal-close"
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
