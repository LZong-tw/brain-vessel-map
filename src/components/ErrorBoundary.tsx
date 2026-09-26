import { Component, type ReactNode } from 'react';

interface Props {
  fallback: (reset: () => void) => ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

/** Keeps a failure in one view (e.g. WebGL context creation) from blanking the whole app. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}
