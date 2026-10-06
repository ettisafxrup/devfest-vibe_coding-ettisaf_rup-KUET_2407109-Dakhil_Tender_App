import { useI18n } from '../i18n';
import type { Project } from '../state/useProject';
import type { Tender } from '../types';
import { ActionBar } from './ActionBar';
import { FileTray } from './FileTray';
import { Icon } from './Icon';
import { Ledger } from './Ledger';
import { TenderHeader } from './TenderHeader';

interface Props {
  project: Project;
  tender: Tender;
  onReset: () => void;
  /** Optional line of context under the tender details (used on the sample page). */
  note?: string;
  /** Sample page only: fills every required document with its correct file in one click. */
  onQuickSelect?: () => void;
}

export function Workspace({ project, tender, onReset, note, onQuickSelect }: Props) {
  const { t } = useI18n();
  const loading = project.pending.length > 0;
  return (
    <>
      <div className="workspace">
        <TenderHeader tender={tender} onReset={onReset} />
        {(note || onQuickSelect) && (
          <div className="workspace__intro">
            {note && <p className="workspace__note">{note}</p>}
            {onQuickSelect && (
              <button type="button" className="btn btn--secondary" disabled={loading} onClick={onQuickSelect}>
                <Icon name="check" />
                {t('sample.quick')}
              </button>
            )}
          </div>
        )}
        <div className="workspace__grid">
          <Ledger project={project} />
          <FileTray project={project} />
        </div>
      </div>
      <ActionBar tender={tender} rows={project.rows} pristine={project.pristine} />
    </>
  );
}
