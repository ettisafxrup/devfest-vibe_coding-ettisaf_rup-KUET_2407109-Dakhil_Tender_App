import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { SampleGate } from './components/SampleGate';
import { StartScreen, type StartError } from './components/StartScreen';
import { TopBar } from './components/TopBar';
import { Workspace } from './components/Workspace';
import { useI18n } from './i18n';
import { carriesDesktopFiles } from './lib/dnd';
import { RequirementsError, parseRequirements } from './lib/requirements';
import { navigate, useRoute } from './lib/router';
import { loadSamplePack } from './lib/sample';
import { useProject } from './state/useProject';

const isJson = (file: File) => /\.json$/i.test(file.name) || file.type === 'application/json';

export default function App() {
  const { t } = useI18n();
  const route = useRoute();
  // Two independent workspaces, so trying the sample never touches the user's own tender.
  const own = useProject();
  const sample = useProject();
  const main = useRef<HTMLElement>(null);

  const [startError, setStartError] = useState<StartError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const sampleRequested = useRef(false);

  const { tender: ownTender, loadTender: loadOwn, addFiles: addOwnFiles, reset: resetOwn } = own;
  const { tender: sampleTender, loadTender: loadSample, addFiles: addSampleFiles, reset: resetSample } = sample;

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
        loadOwn(parsed.tender, parsed.requirements);
        void addOwnFiles(incoming.filter((file) => file !== requirementsFile));
        navigate('tender');
      } catch (error) {
        setStartError(error instanceof RequirementsError ? error.code : 'json');
      } finally {
        setBusy(false);
      }
    },
    [loadOwn, addOwnFiles],
  );

  // The sample route loads its own pack, so a direct link or a refresh works too.
  useEffect(() => {
    if (route !== 'sample' || sampleTender || sampleStatus !== 'idle' || sampleRequested.current) return;
    sampleRequested.current = true;
    setSampleStatus('loading');
    loadSamplePack()
      .then(async (files) => {
        const requirementsFile = files.find(isJson);
        if (!requirementsFile) throw new Error('Sample pack has no requirements.json');
        const parsed = parseRequirements(await requirementsFile.text());
        loadSample(parsed.tender, parsed.requirements);
        void addSampleFiles(files.filter((file) => file !== requirementsFile));
        setSampleStatus('idle');
      })
      .catch(() => setSampleStatus('error'))
      .finally(() => {
        sampleRequested.current = false;
      });
  }, [route, sampleTender, sampleStatus, loadSample, addSampleFiles]);

  // "/tender" with nothing opened has nothing to show: go home instead of a blank page.
  useEffect(() => {
    if (route === 'tender' && !ownTender) navigate('home', { replace: true });
  }, [route, ownTender]);

  // Move keyboard and screen-reader focus to the new page on navigation.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [route]);

  // Files dropped anywhere on the page are handled, never opened by the browser.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (carriesDesktopFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesDesktopFiles(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (route === 'tender' && ownTender) void addOwnFiles(files);
      else if (route === 'sample' && sampleTender) void addSampleFiles(files);
      else if (route === 'home') void openTender(files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [route, ownTender, sampleTender, addOwnFiles, addSampleFiles, openTender]);

  // A plain "#main" link would be read as a route, so the skip link moves focus itself.
  const skipToMain = (event: MouseEvent) => {
    event.preventDefault();
    main.current?.focus();
  };

  const shownTender = route === 'tender' ? ownTender : route === 'sample' ? sampleTender : null;

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={skipToMain}>
        {t('app.skip')}
      </a>
      <TopBar route={route} tenderId={shownTender?.tender_id} hasOwnTender={ownTender !== null} />
      <main id="main" ref={main} tabIndex={-1} className="app__main">
        {route === 'home' && <StartScreen onFiles={openTender} error={startError} busy={busy} resume={ownTender} />}

        {route === 'tender' && ownTender && (
          <Workspace
            project={own}
            tender={ownTender}
            onReset={() => {
              navigate('home');
              resetOwn();
            }}
          />
        )}

        {route === 'sample' &&
          (sampleTender ? (
            <Workspace
              project={sample}
              tender={sampleTender}
              note={t('sample.note')}
              onReset={() => {
                navigate('home');
                resetSample();
              }}
            />
          ) : (
            <SampleGate failed={sampleStatus === 'error'} onRetry={() => setSampleStatus('idle')} />
          ))}
      </main>
    </div>
  );
}
