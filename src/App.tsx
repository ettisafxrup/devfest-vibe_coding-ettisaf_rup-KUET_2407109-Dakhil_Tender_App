import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Backdrop } from './components/Backdrop';
import { CursorFollower } from './components/CursorFollower';
import { SampleGate } from './components/SampleGate';
import { SiteFooter } from './components/SiteFooter';
import { StartScreen, type StartError } from './components/StartScreen';
import { TopBar } from './components/TopBar';
import { Workspace } from './components/Workspace';
import { useI18n } from './i18n';
import { carriesDesktopFiles, collectDroppedFiles } from './lib/dnd';
import { RequirementsError, parseRequirements } from './lib/requirements';
import { handleLinkClick, navigate, useRoute } from './lib/router';
import { SAMPLE_ANSWERS, loadSamplePack } from './lib/sample';
import { useProject } from './state/useProject';
import type { Requirement, Tender } from './types';

const isJson = (file: File) => /\.json$/i.test(file.name) || file.type === 'application/json';

/** The requirements file among whatever was picked; one actually named requirements.json wins. */
const findRequirementsFile = (files: File[]): File | undefined =>
  files.find((file) => /^requirements\.json$/i.test(file.name)) ?? files.find(isJson);

interface PendingOpen {
  tender: Tender;
  requirements: Requirement[];
  files: File[];
}

export default function App() {
  const { t } = useI18n();
  const route = useRoute();
  // Two independent workspaces, so trying the sample never touches the user's own tender.
  const own = useProject();
  const sample = useProject();
  const main = useRef<HTMLElement>(null);

  const [startError, setStartError] = useState<StartError | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null);
  const [sampleStatus, setSampleStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const sampleRequested = useRef(false);

  const { tender: ownTender, loadTender: loadOwn, addFiles: addOwnFiles, reset: resetOwn } = own;
  const { tender: sampleTender, loadTender: loadSample, addFiles: addSampleFiles, reset: resetSample } = sample;
  const ownHasWork = own.files.length > 0 || own.pending.length > 0;

  const commitOpen = useCallback(
    ({ tender, requirements, files }: PendingOpen) => {
      // The tender must be in place before the URL changes, or "/tender" would find nothing and bounce home.
      flushSync(() => loadOwn(tender, requirements));
      void addOwnFiles(files);
      navigate('tender');
    },
    [loadOwn, addOwnFiles],
  );

  /** Opens a tender from whatever was picked: requirements.json, optionally with PDFs alongside. */
  const openTender = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return;
      const requirementsFile = findRequirementsFile(incoming);
      if (!requirementsFile) {
        setStartError('none');
        return;
      }
      setBusy(true);
      try {
        const parsed = parseRequirements(await requirementsFile.text());
        const next = { ...parsed, files: incoming.filter((file) => file !== requirementsFile) };
        setStartError(null);
        // Never throw away loaded files without asking first.
        if (ownHasWork) setPendingOpen(next);
        else commitOpen(next);
      } catch (error) {
        setStartError(error instanceof RequirementsError ? error.code : 'json');
      } finally {
        setBusy(false);
      }
    },
    [ownHasWork, commitOpen],
  );

  const answerReplace = (confirmed: boolean) => {
    const next = pendingOpen;
    setPendingOpen(null);
    if (confirmed && next) commitOpen(next);
  };

  // The sample route loads its own pack, so a direct link or a refresh works too.
  useEffect(() => {
    if (route !== 'sample' || sampleTender || sampleStatus !== 'idle' || sampleRequested.current) return;
    sampleRequested.current = true;
    setSampleStatus('loading');
    loadSamplePack()
      .then(async (files) => {
        const requirementsFile = findRequirementsFile(files);
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
    setPendingOpen(null);
  }, [route]);

  // In-app links switch pages without reloading (a reload would drop the loaded files).
  useEffect(() => {
    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Closing or refreshing the tab would lose the user's files, so the browser asks first.
  useEffect(() => {
    if (!ownHasWork) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ownHasWork]);

  // Files dropped anywhere on the page are handled, never opened by the browser.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (carriesDesktopFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesDesktopFiles(event)) return;
      event.preventDefault();
      void collectDroppedFiles(event.dataTransfer).then((files) => {
        if (route === 'tender' && ownTender) void addOwnFiles(files);
        else if (route === 'sample' && sampleTender) void addSampleFiles(files);
        else if (route === 'home') void openTender(files);
      });
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [route, ownTender, sampleTender, addOwnFiles, addSampleFiles, openTender]);

  /** Sample page only: put the right file on every required document, dates included. */
  const quickSelect = () => {
    sample.assign(
      SAMPLE_ANSWERS.flatMap(({ requirementId, fileName, expiry }) => {
        const file = sample.files.find((candidate) => candidate.name === fileName);
        // A file the visitor removed is skipped; that document is left for them.
        return file ? [{ requirementId, fileId: file.id, expiry }] : [];
      }),
    );
  };

  const skipToMain = (event: MouseEvent) => {
    event.preventDefault();
    main.current?.focus();
  };

  const shownTender = route === 'tender' ? ownTender : route === 'sample' ? sampleTender : null;

  return (
    <div className="app">
      <Backdrop />
      <a className="skip-link" href="#main" onClick={skipToMain}>
        {t('app.skip')}
      </a>
      <TopBar route={route} tenderId={shownTender?.tender_id} hasOwnTender={ownTender !== null} />
      <main id="main" ref={main} tabIndex={-1} className="app__main">
        {route === 'home' && (
          <StartScreen
            onFiles={openTender}
            error={startError}
            busy={busy}
            resume={ownTender}
            replacing={pendingOpen?.tender.tender_id ?? null}
            onReplace={answerReplace}
          />
        )}

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
              onQuickSelect={quickSelect}
              onReset={() => {
                navigate('home');
                resetSample();
              }}
            />
          ) : (
            <SampleGate failed={sampleStatus === 'error'} onRetry={() => setSampleStatus('idle')} />
          ))}
      </main>
      <SiteFooter />
      <CursorFollower />
    </div>
  );
}
