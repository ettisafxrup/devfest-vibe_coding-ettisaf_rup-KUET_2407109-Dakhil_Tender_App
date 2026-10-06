import { PDFDocument } from 'pdf-lib';
import type { RejectReason, UploadedFile } from '../types';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export type ReadResult = { ok: true; file: UploadedFile } | { ok: false; reason: RejectReason };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/** The spec allows the header anywhere in the first 1024 bytes. */
function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - PDF_MAGIC.length, 1024);
  for (let i = 0; i <= limit; i++) {
    if (PDF_MAGIC.every((b, j) => bytes[i + j] === b)) return true;
  }
  return false;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Reads one picked file: checks it really is a usable PDF, counts pages, hashes content. */
export async function readPdf(file: File): Promise<ReadResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { ok: false, reason: 'damaged' };
  }
  const bytes = new Uint8Array(buffer);
  if (!hasPdfHeader(bytes)) return { ok: false, reason: 'notPdf' };

  let pages: number;
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    pages = doc.getPageCount();
  } catch (error) {
    const locked = /encrypt/i.test(error instanceof Error ? error.message : '');
    return { ok: false, reason: locked ? 'locked' : 'damaged' };
  }
  if (pages < 1) return { ok: false, reason: 'damaged' };

  return {
    ok: true,
    file: {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      pages,
      hash: await sha256(buffer),
      bytes,
    },
  };
}
