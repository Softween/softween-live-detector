import { Component, type ReactNode, type ErrorInfo } from 'react';
import mixpanel from 'mixpanel-browser';
import { mixpanelEnabled } from '../../lib/analytics';
import i18n from '../../i18n';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
    if (mixpanelEnabled) {
      mixpanel.track('Error', {
        error_type: 'runtime',
        error_message: error.message,
        error_code: error.name,
        page_url: window.location.href,
      });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = i18n.t.bind(i18n);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-zinc-100">{t('error.title')}</h1>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">{t('error.description')}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary"
          >
            {t('error.retry')}
          </button>
          <button onClick={() => window.location.reload()} className="btn-primary">
            {t('error.refresh')}
          </button>
        </div>
      </div>
    );
  }
}
