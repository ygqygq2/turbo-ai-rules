import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ErrorBoundaryProps {}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error, errorInfo: null } as ErrorBoundaryState;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console and keep error info for rendering
    console.error('ErrorBoundary caught', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    if (error) {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ color: 'var(--vscode-errorForeground)', marginBottom: 8, fontWeight: 600 }}>
            Failed to load the form
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
            {String(error && error.message)}
            {errorInfo ? '\n' + (errorInfo.componentStack || '') : ''}
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
