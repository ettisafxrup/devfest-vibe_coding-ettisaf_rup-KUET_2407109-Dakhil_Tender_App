import { useI18n } from '../i18n';
import { hrefOf } from '../lib/router';

/** What the sample route shows while the pack is being fetched, or if that fails. */
export function SampleGate({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <section className="gate" aria-busy={!failed}>
      {failed ? (
        <>
          <p className="message message--error" role="alert">
            {t('start.err.sample')}
          </p>
          <div className="gate__actions">
            <button type="button" className="btn btn--secondary" onClick={onRetry}>
              {t('sample.retry')}
            </button>
            <a className="btn btn--ghost" href={hrefOf('home')}>
              {t('sample.home')}
            </a>
          </div>
        </>
      ) : (
        <p className="gate__loading" role="status">
          {t('sample.loading')}
          <span className="gate__bar" />
        </p>
      )}
    </section>
  );
}
