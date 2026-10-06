import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { DropZone } from './DropZone';

export type StartError = 'json' | 'shape' | 'none' | 'sample';

interface Props {
  onFiles: (files: File[]) => void;
  onSample: () => void;
  error: StartError | null;
  busy: boolean;
}

const STEPS: StringKey[] = ['start.step1', 'start.step2', 'start.step3'];

export function StartScreen({ onFiles, onSample, error, busy }: Props) {
  const { t } = useI18n();
  return (
    <section className="start" aria-labelledby="start-title">
      <h1 id="start-title" className="start__title">
        {t('start.title')}
      </h1>
      <p className="start__lead">{t('start.lead')}</p>

      <DropZone
        size="large"
        title={busy ? t('start.loading') : t('start.drop')}
        hint={t('start.dropHint')}
        buttonLabel={t('start.choose')}
        accept=".json,application/json,.pdf,application/pdf"
        onFiles={onFiles}
        busy={busy}
      >
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onSample}>
          {t('start.sample')}
        </button>
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
