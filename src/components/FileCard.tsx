import { useI18n } from '../i18n';
import { FILE_DRAG_TYPE, cx } from '../lib/dnd';
import { titleOf } from '../lib/status';
import type { Project } from '../state/useProject';
import type { UploadedFile } from '../types';
import { Icon } from './Icon';
import { Select, type SelectOption } from './Select';

export function FileCard({ file, project }: { file: UploadedFile; project: Project }) {
  const { t, lang } = useI18n();
  const usedFor = project.placement.get(file.id);
  const twin = project.duplicateOf.get(file.id);

  const options: SelectOption[] = [
    { value: '', label: t('file.notUsed') },
    ...project.requirements.map((requirement) => ({
      value: requirement.id,
      label: `${requirement.order}. ${titleOf(requirement, lang)}`,
      disabled: project.duplicateConflict(file.id, requirement.id) !== null,
    })),
  ];

  return (
    <li
      className={cx('file', !usedFor && 'file--unplaced')}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(FILE_DRAG_TYPE, file.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="file__head">
        <span className="file__sheet" aria-hidden="true">
          PDF
        </span>
        <div className="file__text">
          <p className="file__name" title={file.name}>
            {file.name}
          </p>
          <p className="file__meta">
            {file.pages === 1 ? t('file.pages.one') : t('file.pages.many', { n: file.pages })}
            {!usedFor && <span className="file__unplaced"> · {t('file.unplaced')}</span>}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('file.remove', { file: file.name })}
          title={t('file.remove', { file: file.name })}
          onClick={() => project.removeFile(file.id)}
        >
          <Icon name="close" />
        </button>
      </div>

      {twin && <p className="tag tag--duplicate">{t('file.duplicate', { file: twin.name })}</p>}

      <label className="field field--inline">
        <span className="field__label">{t('file.useFor')}</span>
        <Select
          value={usedFor?.id ?? ''}
          empty={!usedFor}
          options={options}
          onChange={(requirementId) => {
            if (requirementId) project.match(requirementId, file.id);
            else if (usedFor) project.unmatch(usedFor.id);
          }}
        />
      </label>
    </li>
  );
}
