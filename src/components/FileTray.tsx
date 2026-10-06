import { useI18n } from '../i18n';
import { titleOf } from '../lib/status';
import type { Project } from '../state/useProject';
import { DropZone } from './DropZone';
import { FileCard } from './FileCard';
import { Icon } from './Icon';

/** Every uploaded file, unplaced ones first, plus anything that was turned away. */
export function FileTray({ project }: { project: Project }) {
  const { t, lang } = useI18n();
  const { files, pending, rejections, notice, placement } = project;
  const ordered = [...files].sort((a, b) => Number(placement.has(a.id)) - Number(placement.has(b.id)));
  const isEmpty = files.length === 0 && pending.length === 0;

  return (
    <section className="panel tray" aria-labelledby="tray-title">
      <header className="panel__head">
        <h2 id="tray-title" className="panel__title">
          {t('tray.title')}
          {files.length > 0 && <span className="panel__count mono">{files.length}</span>}
        </h2>
        {files.length > 0 && <p className="panel__hint">{t('file.drag')}</p>}
      </header>

      <DropZone
        title={t('tray.drop')}
        hint={t('tray.limits')}
        buttonLabel={t('tray.choose')}
        accept=".pdf,application/pdf"
        onFiles={project.addFiles}
      />

      <div className="tray__messages" aria-live="polite">
        {notice && (
          <div className="message message--warning">
            <Icon name="alert" />
            <p>
              {t('notice.duplicate', {
                file: notice.file.name,
                other: notice.other.name,
                doc: titleOf(notice.requirement, lang),
              })}
            </p>
            <button type="button" className="icon-btn" aria-label={t('common.dismiss')} onClick={project.dismissNotice}>
              <Icon name="close" />
            </button>
          </div>
        )}
        {rejections.map((rejection) => (
          <div key={rejection.id} className="message message--error">
            <Icon name="alert" />
            <p>{t(`reject.${rejection.reason}`, { file: rejection.name })}</p>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('common.dismiss')}
              onClick={() => project.dismissRejection(rejection.id)}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>

      {isEmpty ? (
        <p className="tray__empty">{t('tray.empty')}</p>
      ) : (
        <ul className="tray__files">
          {ordered.map((file) => (
            <FileCard key={file.id} file={file} project={project} />
          ))}
          {pending.map((item) => (
            <li key={item.id} className="file file--pending" aria-busy="true">
              <div className="file__head">
                <span className="file__sheet" aria-hidden="true" />
                <div className="file__text">
                  <p className="file__name">{item.name}</p>
                  <p className="file__meta">{t('tray.reading')}</p>
                </div>
              </div>
              <span className="file__progress" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
