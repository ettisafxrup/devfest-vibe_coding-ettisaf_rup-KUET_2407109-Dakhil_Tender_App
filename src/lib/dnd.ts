import type { DragEvent } from 'react';

/** Marks a drag that carries one of our uploaded files (as opposed to files from the desktop). */
export const FILE_DRAG_TYPE = 'application/x-dakhil-file';

export const carriesUploadedFile = (event: DragEvent): boolean =>
  event.dataTransfer.types.includes(FILE_DRAG_TYPE);

export const carriesDesktopFiles = (event: DragEvent | globalThis.DragEvent): boolean =>
  Boolean(event.dataTransfer?.types.includes('Files'));

export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');

/** Files an operating system leaves in folders; nobody means to submit these. */
const JUNK = /^(\.|~\$)|^(thumbs\.db|desktop\.ini)$/i;
const MAX_DEPTH = 6;
const MAX_FOLDER_FILES = 500;

/** The slice of the browser's file-system entry API that folder drops need. */
export interface DroppedEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (resolve: (file: File) => void, reject: (error: unknown) => void) => void;
  createReader?: () => {
    readEntries: (resolve: (entries: DroppedEntry[]) => void, reject: (error: unknown) => void) => void;
  };
}

async function childrenOf(directory: DroppedEntry): Promise<DroppedEntry[]> {
  const reader = directory.createReader?.();
  if (!reader) return [];
  const all: DroppedEntry[] = [];
  // readEntries hands back a batch at a time and an empty batch when done.
  for (;;) {
    const batch = await new Promise<DroppedEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

/** Flattens dropped entries, walking into folders, into a plain list of files. */
export async function filesFromEntries(entries: (DroppedEntry | null)[]): Promise<File[]> {
  const files: File[] = [];
  const walk = async (entry: DroppedEntry, depth: number, insideFolder: boolean): Promise<void> => {
    if (files.length >= MAX_FOLDER_FILES) return;
    if (insideFolder && JUNK.test(entry.name)) return;
    if (entry.isFile && entry.file) {
      try {
        files.push(await new Promise<File>((resolve, reject) => entry.file!(resolve, reject)));
      } catch {
        // An unreadable entry is skipped; the rest of the folder still loads.
      }
    } else if (entry.isDirectory && depth < MAX_DEPTH) {
      for (const child of await childrenOf(entry).catch(() => [])) await walk(child, depth + 1, true);
    }
  };
  for (const entry of entries) if (entry) await walk(entry, 0, false);
  return files;
}

/**
 * Everything the user dropped, including the contents of dropped folders.
 * Must be called during the drop event itself: the browser empties the
 * DataTransfer as soon as the handler returns.
 */
export function collectDroppedFiles(data: DataTransfer | null | undefined): Promise<File[]> {
  if (!data) return Promise.resolve([]);
  const plain = Array.from(data.files ?? []);
  const entries = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null));
  if (!entries.some((entry) => entry?.isDirectory)) return Promise.resolve(plain);
  return filesFromEntries(entries as (DroppedEntry | null)[]).catch(() => plain);
}
