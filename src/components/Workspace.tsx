import type { Project } from '../state/useProject';
import type { Tender } from '../types';
import { ActionBar } from './ActionBar';
import { FileTray } from './FileTray';
import { Ledger } from './Ledger';
import { TenderHeader } from './TenderHeader';

interface Props {
  project: Project;
  tender: Tender;
  onReset: () => void;
  /** Optional line of context under the tender details (used on the sample page). */
  note?: string;
}

export function Workspace({ project, tender, onReset, note }: Props) {
  return (
    <>
      <div className="workspace">
        <TenderHeader tender={tender} onReset={onReset} />
        {note && <p className="workspace__note">{note}</p>}
        <div className="workspace__grid">
          <Ledger project={project} />
          <FileTray project={project} />
        </div>
      </div>
      <ActionBar tender={tender} rows={project.rows} pristine={project.pristine} />
    </>
  );
}
