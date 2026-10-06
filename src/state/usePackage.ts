import { useCallback, useEffect, useRef, useState } from 'react';
import { PackageError, buildPackage, entriesFromRows, packageFileName } from '../lib/package';
import type { Row, Tender } from '../types';

export type PackageState =
  | { phase: 'idle' }
  | { phase: 'building'; page: number; total: number }
  | { phase: 'done'; url: string; pages: number; fileName: string }
  | { phase: 'error'; fileName: string };

/** Builds the package on demand and throws the result away as soon as the checklist changes. */
export function usePackage(tender: Tender, rows: Row[]) {
  const [state, setState] = useState<PackageState>({ phase: 'idle' });
  const run = useRef(0);
  const url = useRef<string | null>(null);

  const discard = useCallback(() => {
    run.current += 1;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);

  useEffect(() => {
    discard();
    setState({ phase: 'idle' });
    return discard;
  }, [rows, tender, discard]);

  const generate = useCallback(async () => {
    discard();
    const token = run.current;
    const entries = entriesFromRows(rows);
    setState({ phase: 'building', page: 0, total: 0 });
    try {
      const bytes = await buildPackage(tender, entries, (page, total) => {
        if (run.current === token) setState({ phase: 'building', page, total });
      });
      if (run.current !== token) return;
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      url.current = URL.createObjectURL(blob);
      const pages = 1 + entries.reduce((sum, entry) => sum + entry.file.pages, 0);
      setState({ phase: 'done', url: url.current, pages, fileName: packageFileName(tender) });
    } catch (error) {
      if (run.current !== token) return;
      setState({ phase: 'error', fileName: error instanceof PackageError ? error.fileName : '' });
    }
  }, [rows, tender, discard]);

  return { state, generate };
}
