import { PDFDocument, ParseSpeeds } from 'pdf-lib';
import type { RejectReason, UploadedFile } from '../types';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/** Fewer pauses than pdf-lib's default, so a throttled background tab does not crawl. */
export const PARSE_OPTIONS = { updateMetadata: false, parseSpeed: ParseSpeeds.Fast } as const;

export type ReadResult = { ok: true; file: UploadedFile } | { ok: false; reason: RejectReason };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const HEADER_WINDOW = 1024;

/** The spec allows the header anywhere in the first 1024 bytes. */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const last = Math.min(bytes.length - PDF_MAGIC.length, HEADER_WINDOW);
  for (let i = 0; i <= last; i++) {
    if (PDF_MAGIC.every((b, j) => bytes[i + j] === b)) return true;
  }
  return false;
}

/** crypto.randomUUID only exists on HTTPS and localhost; ids just need to be unique here. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Plain SHA-256, used only where Web Crypto is unavailable (plain-HTTP origins). */
export function sha256Fallback(data: Uint8Array): string {
  const k = new Uint32Array(64);
  const h = new Uint32Array(8);
  const frac = (x: number) => ((x - Math.floor(x)) * 0x100000000) >>> 0;
  for (let n = 2, found = 0; found < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (!prime) continue;
    if (found < 8) h[found] = frac(Math.sqrt(n));
    k[found++] = frac(Math.cbrt(n));
  }

  const bitLength = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const t1 = (hh + s1 + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  h.forEach((word, i) => new DataView(out.buffer).setUint32(i * 4, word));
  return toHex(out);
}

/** Fingerprint of the exact file content; equal fingerprints mean duplicate files. */
export async function contentHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)));
    } catch {
      // fall through to the script implementation
    }
  }
  return sha256Fallback(new Uint8Array(buffer));
}

/** Reads one picked file: checks it really is a usable PDF, counts pages, hashes content. */
export async function readPdf(file: File): Promise<ReadResult> {
  try {
    // Look at the first bytes only, so a huge non-PDF is turned away without loading it.
    const head = new Uint8Array(await file.slice(0, HEADER_WINDOW + PDF_MAGIC.length).arrayBuffer());
    if (!hasPdfHeader(head)) return { ok: false, reason: 'notPdf' };
    if (file.size > MAX_TOTAL_BYTES) return { ok: false, reason: 'tooLarge' };

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let pages: number;
    try {
      const doc = await PDFDocument.load(bytes, PARSE_OPTIONS);
      pages = doc.getPageCount();
    } catch (error) {
      const locked = /encrypt/i.test(error instanceof Error ? error.message : '');
      return { ok: false, reason: locked ? 'locked' : 'damaged' };
    }
    if (pages < 1) return { ok: false, reason: 'damaged' };

    return {
      ok: true,
      file: { id: newId(), name: file.name, size: bytes.length, pages, hash: await contentHash(buffer), bytes },
    };
  } catch {
    // The file vanished, is a folder, or the browser refused to hand it over.
    return { ok: false, reason: 'unreadable' };
  }
}
