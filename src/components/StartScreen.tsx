import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { hrefOf } from '../lib/router';
import type { Tender } from '../types';
import { DropZone } from './DropZone';
import { TypedText } from './TypedText';

export type StartError = 'json' | 'shape' | 'none';

interface Props {
  onFiles: (files: File[]) => void;
  error: StartError | null;
  busy: boolean;
  /** A tender the user already opened, so going home never strands their work. */
  resume: Tender | null;
  /** Set when opening a new tender would discard the current one: its id, awaiting a yes or no. */
  replacing: string | null;
  onReplace: (confirmed: boolean) => void;
}

const STEPS: StringKey[] = ['start.step1', 'start.step2', 'start.step3'];

export function StartScreen({ onFiles, error, busy, resume, replacing, onReplace }: Props) {
  const { t } = useI18n();
  return (
    <section className="start" aria-labelledby="start-title">
      <h1 id="start-title" className="start__title">
        <TypedText text={t('start.title')} />
      </h1>
      <p className="start__lead">{t('start.lead')}</p>

      {resume && !replacing && (
        <a className="resume" href={hrefOf('tender')}>
          <span className="resume__label">{t('start.resume')}</span>
          <span className="resume__title">{resume.title || resume.tender_id}</span>
          <span className="resume__id mono">{resume.tender_id}</span>
        </a>
      )}

      {replacing && resume ? (
        <div className="message message--warning confirm" role="alertdialog" aria-label={t('start.replaceYes')}>
          <p>{t('start.replace', { id: replacing, current: resume.tender_id })}</p>
          <div className="confirm__actions">
            <button type="button" className="btn btn--danger" onClick={() => onReplace(true)}>
              {t('start.replaceYes')}
            </button>
            <button type="button" className="btn btn--ghost" autoFocus onClick={() => onReplace(false)}>
              {t('tender.cancel')}
            </button>
          </div>
        </div>
      ) : (
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
      )}

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
