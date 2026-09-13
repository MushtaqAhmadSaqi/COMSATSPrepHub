import React, { Component } from 'react';
import './ErrorBoundary.css';

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
    // Report to console (extend with error reporting service if needed)
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">
              <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>
                warning
              </span>
            </div>
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              An unexpected error occurred. Don't worry — your data is safe.
              Try reloading the page, or go back to the home page.
            </p>
            {this.state.error && (
              <details className="error-boundary__details">
                <summary>Error details</summary>
                <pre>{String(this.state.error)}</pre>
              </details>
            )}
            <div className="error-boundary__actions">
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--primary"
                onClick={this.handleReload}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                Reload Page
              </button>
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--secondary"
                onClick={this.handleGoHome}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>home</span>
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
