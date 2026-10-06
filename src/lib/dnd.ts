import type { DragEvent } from 'react';

/** Marks a drag that carries one of our uploaded files (as opposed to files from the desktop). */
export const FILE_DRAG_TYPE = 'application/x-dakhil-file';

export const carriesUploadedFile = (event: DragEvent): boolean =>
  event.dataTransfer.types.includes(FILE_DRAG_TYPE);

export const carriesDesktopFiles = (event: DragEvent | globalThis.DragEvent): boolean =>
  Boolean(event.dataTransfer?.types.includes('Files'));

export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');
