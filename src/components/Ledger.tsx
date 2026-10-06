import { useI18n } from '../i18n';
import type { Project } from '../state/useProject';
import { LedgerRow } from './LedgerRow';

/** The checklist. Its order is the order of the final package. */
export function Ledger({ project }: { project: Project }) {
  const { t } = useI18n();
  return (
    <section className="panel ledger" aria-labelledby="ledger-title">
      <header className="panel__head">
        <h2 id="ledger-title" className="panel__title">
          {t('ledger.title')}
        </h2>
        <p className="panel__hint">{t('ledger.hint')}</p>
      </header>
      <ol className="ledger__rows">
        {project.rows.map((row) => (
          <LedgerRow key={row.requirement.id} row={row} project={project} />
        ))}
      </ol>
    </section>
  );
}
