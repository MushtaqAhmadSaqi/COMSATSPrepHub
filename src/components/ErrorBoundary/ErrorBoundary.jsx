import React, { Component } from 'react';
import { logger } from '../../utils/logger';
import './ErrorBoundary.css';

const isDev =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  Boolean(import.meta.env.DEV);

/**
 * ErrorBoundary — catches React rendering errors and shows a friendly fallback.
 * Uses class component since getDerivedStateFromError is only available in classes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary', `${error?.message || error} ${errorInfo?.componentStack || ''}`);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '';
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">
              <span className="material-symbols-outlined" style={{ fontSize: '3rem' }} aria-hidden="true">
                warning
              </span>
            </div>
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              An unexpected error occurred. Don&apos;t worry — your study data is safe.
              Try recovering the view, reloading the page, or returning home.
            </p>
            {isDev && this.state.error && (
              <details className="error-boundary__details">
                <summary>Developer error details</summary>
                <pre>{String(this.state.error?.message || this.state.error)}</pre>
              </details>
            )}
            <div className="error-boundary__actions">
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--primary"
                onClick={this.handleReset}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">restart_alt</span>
                Try Again
              </button>
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--secondary"
                onClick={this.handleReload}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">refresh</span>
                Reload Page
              </button>
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--secondary"
                onClick={this.handleGoHome}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">home</span>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
