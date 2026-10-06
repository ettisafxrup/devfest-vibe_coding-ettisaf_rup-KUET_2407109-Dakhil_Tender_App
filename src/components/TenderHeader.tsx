import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { Tender } from '../types';

export function TenderHeader({ tender, onReset }: { tender: Tender; onReset: () => void }) {
  const { t, formatDate } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const startOver = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Cancelling puts keyboard focus back where it came from.
  useEffect(() => {
    if (wasConfirming.current && !confirming) startOver.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <section className="tender" aria-labelledby="tender-title">
      <div className="tender__head">
        <h1 id="tender-title" className="tender__title">
          {tender.title || tender.tender_id}
        </h1>
        {confirming ? (
          <div className="tender__confirm" role="group" aria-label={t('tender.confirm')}>
            <span>{t('tender.confirm')}</span>
            <button type="button" className="btn btn--danger" onClick={onReset}>
              {t('tender.confirmYes')}
            </button>
            <button type="button" className="btn btn--ghost" autoFocus onClick={() => setConfirming(false)}>
              {t('tender.cancel')}
            </button>
          </div>
        ) : (
          <button ref={startOver} type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
            {t('tender.startOver')}
          </button>
        )}
      </div>
      <dl className="tender__facts">
        <div>
          <dt>{t('tender.id')}</dt>
          <dd className="mono">{tender.tender_id}</dd>
        </div>
        <div>
          <dt>{t('tender.entity')}</dt>
          <dd>{tender.procuring_entity || '—'}</dd>
        </div>
        <div>
          <dt>{t('tender.bidder')}</dt>
          <dd>{tender.bidder || '—'}</dd>
        </div>
        <div>
          <dt>{t('tender.deadline')}</dt>
          <dd>
            <time dateTime={tender.submission_deadline}>{formatDate(tender.submission_deadline)}</time>
          </dd>
        </div>
      </dl>
    </section>
  );
}
