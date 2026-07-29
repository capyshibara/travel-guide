import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../design-system';

interface Props {
  children: ReactNode;
  /** Shown instead of the default message, e.g. for a single page. */
  title?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors so one bad record cannot blank the whole app.
 *
 * The error itself is intentionally not rendered or logged with its message: it can
 * contain workbook contents, and this app's promise is that workbook data stays with
 * the traveler.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // No reporting: nothing about the workbook leaves the device.
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        title={this.props.title ?? 'Something went wrong showing this'}
        description="Your workbook data is untouched. Try again, or go back and pick another section."
        onRetry={this.handleRetry}
      />
    );
  }
}
