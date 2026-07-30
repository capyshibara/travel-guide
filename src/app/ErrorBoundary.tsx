import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../design-system';
import { useT } from '../i18n/useT';

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
    return <BoundaryFallback {...(this.props.title ? { title: this.props.title } : {})} onRetry={this.handleRetry} />;
  }
}

/** Split out so the copy can come from the catalogue, which a class component cannot read. */
function BoundaryFallback({ title, onRetry }: { title?: string; onRetry: () => void }) {
  const t = useT();
  return <ErrorState title={title ?? t.errors.boundaryTitle} description={t.errors.boundaryBody} onRetry={onRetry} />;
}
