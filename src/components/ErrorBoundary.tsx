import { Component, type ReactNode } from 'react';
import { useI18n } from '../i18n';

function Fallback() {
  const { t } = useI18n();
  return (
    <section className="gate" role="alert">
      <h1 className="start__title">{t('error.title')}</h1>
      <p className="start__lead">{t('error.body')}</p>
      <div className="gate__actions">
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          {t('error.reload')}
        </button>
      </div>
    </section>
  );
}

/** An unexpected error shows a way forward instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
