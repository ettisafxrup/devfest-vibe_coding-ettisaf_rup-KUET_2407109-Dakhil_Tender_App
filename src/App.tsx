import { useCallback, useEffect, useState } from 'react';
import { StartScreen, type StartError } from './components/StartScreen';
import { TopBar } from './components/TopBar';
import { Workspace } from './components/Workspace';
import { useI18n } from './i18n';
import { carriesDesktopFiles } from './lib/dnd';
import { RequirementsError, parseRequirements } from './lib/requirements';
import { loadSamplePack } from './lib/sample';
import { useProject } from './state/useProject';

const isJson = (file: File) => /\.json$/i.test(file.name) || file.type === 'application/json';

export default function App() {
  const { t } = useI18n();
  const project = useProject();
  const { tender, loadTender, addFiles } = project;
  const [startError, setStartError] = useState<StartError | null>(null);
  const [busy, setBusy] = useState(false);

  /** Opens a tender from whatever was picked: requirements.json, optionally with PDFs alongside. */
  const openTender = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return;
      const requirementsFile = incoming.find(isJson);
      if (!requirementsFile) {
        setStartError('none');
        return;
      }
      setBusy(true);
      try {
        const parsed = parseRequirements(await requirementsFile.text());
        setStartError(null);
        loadTender(parsed.tender, parsed.requirements);
        void addFiles(incoming.filter((file) => file !== requirementsFile));
      } catch (error) {
        setStartError(error instanceof RequirementsError ? error.code : 'json');
      } finally {
        setBusy(false);
      }
    },
    [loadTender, addFiles],
  );

  const openSample = useCallback(async () => {
    setBusy(true);
    try {
      await openTender(await loadSamplePack());
    } catch {
      setStartError('sample');
      setBusy(false);
    }
  }, [openTender]);

  // Files dropped anywhere on the page are handled, never opened by the browser.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (carriesDesktopFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesDesktopFiles(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (tender) void addFiles(files);
      else void openTender(files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [tender, addFiles, openTender]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('app.skip')}
      </a>
      <TopBar tenderId={tender?.tender_id} />
      <main id="main" className="app__main">
        {tender ? (
          <Workspace project={project} tender={tender} />
        ) : (
          <StartScreen onFiles={openTender} onSample={openSample} error={startError} busy={busy} />
        )}
      </main>
    </div>
  );
}
