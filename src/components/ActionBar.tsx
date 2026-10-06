import { useI18n } from '../i18n';
import { entriesFromRows, totalPages } from '../lib/package';
import { isBlocking, rowDomId, titleOf } from '../lib/status';
import { usePackage } from '../state/usePackage';
import type { Row, Tender } from '../types';
import { Icon } from './Icon';

function goToRow(requirementId: string) {
  const element = document.getElementById(rowDomId(requirementId));
  if (!element) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  element.focus({ preventScroll: true });
}

/** Always-visible summary: what still blocks the package, then Generate and Download. */
export function ActionBar({ tender, rows }: { tender: Tender; rows: Row[] }) {
  const { t, lang } = useI18n();
  const { state, generate } = usePackage(tender, rows);

  const required = rows.filter((row) => row.requirement.mandatory);
  const ready = required.filter((row) => row.status === 'ok').length;
  const blockers = rows.filter((row) => isBlocking(row.status));
  const pages = totalPages(entriesFromRows(rows));
  const building = state.phase === 'building';

  return (
    <footer className="actionbar">
      <div className="actionbar__inner">
        <div className="actionbar__summary" aria-live="polite">
          {state.phase === 'done' ? (
            <p className="actionbar__headline actionbar__headline--ok">
              <Icon name="check" />
              {t('bar.done', { pages: state.pages })}
            </p>
          ) : (
            <p className="actionbar__headline">
              {t('bar.progress', { done: ready, total: required.length })}
            </p>
          )}

          {state.phase === 'error' ? (
            <p className="actionbar__detail actionbar__detail--error">{t('bar.error', { file: state.fileName })}</p>
          ) : blockers.length > 0 ? (
            <div className="actionbar__detail">
              <span>{t('bar.fix')}</span>
              <ul className="blockers">
                {blockers.map((row) => (
                  <li key={row.requirement.id}>
                    <button type="button" className="blockers__link" onClick={() => goToRow(row.requirement.id)}>
                      {titleOf(row.requirement, lang)}
                      <span className={`blockers__why blockers__why--${row.status}`}>{t(`status.${row.status}`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : state.phase === 'done' ? (
            <p className="actionbar__detail mono">{state.fileName}</p>
          ) : (
            <p className="actionbar__detail">{t('bar.clear', { pages })}</p>
          )}
        </div>

        <div className="actionbar__actions">
          {state.phase === 'done' ? (
            <>
              <a className="btn btn--ghost" href={state.url} target="_blank" rel="noreferrer">
                <Icon name="external" />
                {t('bar.preview')}
              </a>
              <a className="btn btn--primary" href={state.url} download={state.fileName}>
                <Icon name="download" />
                {t('bar.download')}
              </a>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              disabled={blockers.length > 0 || building}
              aria-describedby={blockers.length > 0 ? 'generate-why' : undefined}
              onClick={generate}
            >
              {building && state.total > 0
                ? t('bar.building', { page: state.page, total: state.total })
                : t('bar.generate')}
            </button>
          )}
        </div>
        {blockers.length > 0 && (
          <span id="generate-why" className="sr-only">
            {t('bar.fix')} {blockers.map((row) => `${titleOf(row.requirement, lang)}: ${t(`status.${row.status}`)}`).join(', ')}
          </span>
        )}
      </div>
      {building && (
        <span
          className="actionbar__progress"
          style={{ width: `${state.total ? (state.page / state.total) * 100 : 4}%` }}
        />
      )}
    </footer>
  );
}
