import { useState, type DragEvent } from 'react';
import { useI18n } from '../i18n';
import { FILE_DRAG_TYPE, carriesUploadedFile, cx } from '../lib/dnd';
import { rowDomId, titleOf } from '../lib/status';
import type { Project } from '../state/useProject';
import type { Row } from '../types';
import { Icon } from './Icon';
import { Select, type SelectOption } from './Select';
import { StatusTag } from './StatusTag';

interface Props {
  row: Row;
  project: Project;
}

export function LedgerRow({ row, project }: Props) {
  const { t, lang, formatDate } = useI18n();
  const [over, setOver] = useState(false);
  const { requirement, file, status } = row;
  const title = titleOf(requirement, lang);

  const options: SelectOption[] = [
    { value: '', label: t('row.noFile') },
    ...project.files.map((candidate) => {
      const usedFor = project.placement.get(candidate.id);
      const blocked = project.duplicateConflict(candidate.id, requirement.id) !== null;
      let label = candidate.name;
      if (blocked) label += ` (${t('row.sameContentUsed')})`;
      else if (usedFor && usedFor.id !== requirement.id) label += ` (${t('row.inUse', { doc: titleOf(usedFor, lang) })})`;
      return { value: candidate.id, label, disabled: blocked };
    }),
  ];

  const onDragOver = (event: DragEvent) => {
    if (!carriesUploadedFile(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(true);
  };
  const onDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
  };
  const onDrop = (event: DragEvent) => {
    const fileId = event.dataTransfer.getData(FILE_DRAG_TYPE);
    if (!fileId) return;
    event.preventDefault();
    setOver(false);
    project.match(requirement.id, fileId);
  };

  // "Missing" needs no extra sentence: the tag and the empty slot already say it.
  const hint =
    status === 'expiryNeeded'
      ? t('row.hint.expiryNeeded')
      : status === 'expired'
        ? t('row.hint.expired', { date: formatDate(project.tender?.submission_deadline ?? '') })
        : null;

  return (
    <li
      id={rowDomId(requirement.id)}
      tabIndex={-1}
      className={cx('row', over && 'row--over')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="row__no mono" aria-hidden="true">
        {String(requirement.order).padStart(2, '0')}
      </span>

      <div className="row__main">
        <div className="row__head">
          <h3 className="row__title">{title}</h3>
          <span className="row__meta">{t(requirement.mandatory ? 'row.required' : 'row.optional')}</span>
        </div>

        <div className="row__controls">
          <div className="row__file">
            <Select
              aria-label={t('row.fileFor', { doc: title })}
              value={file?.id ?? ''}
              empty={!file}
              options={options}
              onChange={(fileId) => (fileId ? project.match(requirement.id, fileId) : project.unmatch(requirement.id))}
            />
            {file && (
              <button
                type="button"
                className="icon-btn"
                aria-label={t('row.unmatch', { doc: title })}
                title={t('row.unmatch', { doc: title })}
                onClick={(event) => {
                  // This button disappears with the match; keep keyboard focus in the row.
                  event.currentTarget.parentElement?.querySelector('select')?.focus();
                  project.unmatch(requirement.id);
                }}
              >
                <Icon name="close" />
              </button>
            )}
          </div>

          {requirement.has_expiry && file && (
            <label className="field">
              <span className="field__label">{t('row.expiry')}</span>
              <input
                type="date"
                className={cx('input mono', status === 'expired' && 'input--error', status === 'expiryNeeded' && 'input--needed')}
                value={row.expiry}
                max="9999-12-31"
                onChange={(event) => project.setExpiry(file.id, event.target.value)}
              />
            </label>
          )}
        </div>

        {hint && <p className={`row__hint row__hint--${status}`}>{hint}</p>}
      </div>

      <div className="row__side">
        <StatusTag status={status} />
        {row.startPage !== null && row.endPage !== null && (
          <span className="row__pages mono">
            {row.startPage === row.endPage
              ? t('row.page', { a: row.startPage })
              : t('row.pages', { a: row.startPage, b: row.endPage })}
          </span>
        )}
      </div>
    </li>
  );
}
