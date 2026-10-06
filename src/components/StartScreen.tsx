import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { hrefOf } from '../lib/router';
import type { Tender } from '../types';
import { DropZone } from './DropZone';

export type StartError = 'json' | 'shape' | 'none';

interface Props {
  onFiles: (files: File[]) => void;
  error: StartError | null;
  busy: boolean;
  /** A tender the user already opened, so going home never strands their work. */
  resume: Tender | null;
}

const STEPS: StringKey[] = ['start.step1', 'start.step2', 'start.step3'];

export function StartScreen({ onFiles, error, busy, resume }: Props) {
  const { t } = useI18n();
  return (
    <section className="start" aria-labelledby="start-title">
      <h1 id="start-title" className="start__title">
        {t('start.title')}
      </h1>
      <p className="start__lead">{t('start.lead')}</p>

      {resume && (
        <a className="resume" href={hrefOf('tender')}>
          <span className="resume__label">{t('start.resume')}</span>
          <span className="resume__title">{resume.title}</span>
          <span className="resume__id mono">{resume.tender_id}</span>
        </a>
      )}

      <DropZone
        size="large"
        title={busy ? t('start.loading') : t('start.drop')}
        hint={t('start.dropHint')}
        buttonLabel={t('start.choose')}
        accept=".json,application/json,.pdf,application/pdf"
        onFiles={onFiles}
        busy={busy}
      >
        <a className="btn btn--ghost" href={hrefOf('sample')}>
          {t('start.sample')}
        </a>
      </DropZone>

      {error && (
        <p className="message message--error" role="alert">
          {t(`start.err.${error}`)}
        </p>
      )}

      <ol className="steps">
        {STEPS.map((key, index) => (
          <li key={key} className="steps__item">
            <span className="steps__no mono">{index + 1}</span>
            {t(key)}
          </li>
        ))}
      </ol>
      <p className="start__privacy">{t('app.privacy')}</p>
    </section>
  );
}
