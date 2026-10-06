import type { Project } from '../state/useProject';
import type { Tender } from '../types';
import { ActionBar } from './ActionBar';
import { FileTray } from './FileTray';
import { Ledger } from './Ledger';
import { TenderHeader } from './TenderHeader';

export function Workspace({ project, tender }: { project: Project; tender: Tender }) {
  return (
    <>
      <div className="workspace">
        <TenderHeader tender={tender} onReset={project.reset} />
        <div className="workspace__grid">
          <Ledger project={project} />
          <FileTray project={project} />
        </div>
      </div>
      <ActionBar tender={tender} rows={project.rows} />
    </>
  );
}
