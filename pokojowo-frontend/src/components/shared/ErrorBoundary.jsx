import { Component } from 'react';
import ErrorFallback from './ErrorFallback';
import { reportError } from '@/lib/errorReporting';

/**
 * Catches render errors in its subtree and shows a way out.
 *
 * Without one of these a single render-time exception unmounts everything and
 * leaves a blank white page — no message, no retry, and nothing in any log.
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
    reportError(error, { componentStack: errorInfo?.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          fullPage={this.props.fullPage}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
