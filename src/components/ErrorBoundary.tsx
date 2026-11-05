import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Shows what broke instead of a blank window. React only supports error
 * boundaries as class components, hence the exception to the arrow-function
 * style.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  // Kept as a field with componentDidCatch below (no static
  // getDerivedStateFromError): the repo's two class-order lint rules can't
  // agree on where a static method goes.
  override state: ErrorBoundaryState = { error: null };

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Goes to the terminal and dev.log via the main process.
    // eslint-disable-next-line no-console
    console.error(
      `[app] render failed: ${error.stack ?? error.message}\n${info.componentStack ?? ''}`
    );
    this.setState({ error });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <div className="page">
        <main className="shell">
          <section className="card crash">
            <h2>Something broke</h2>
            <p className="hint">{error.message}</p>
            <button
              className="btn primary"
              onClick={() => {
                this.setState({ error: null });
              }}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }
}
