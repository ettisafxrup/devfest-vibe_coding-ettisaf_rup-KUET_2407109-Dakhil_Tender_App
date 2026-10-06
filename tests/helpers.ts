import { readFileSync, readdirSync } from 'node:fs';
import { PDFArray, PDFDocument, PDFRawStream, StandardFonts, decodePDFRawStream, degrees, rgb, type PDFPage } from 'pdf-lib';
import { readPdf } from '../src/lib/files';
import type { UploadedFile } from '../src/types';

export const PACK = new URL('../sample-pack/', import.meta.url);

export const packFile = (name: string): File =>
  new File([readFileSync(new URL(`documents/${name}`, PACK))], name);

export const packFileNames = (): string[] => readdirSync(new URL('documents/', PACK)).sort();

export async function upload(name: string, bytes: Uint8Array | Buffer): Promise<UploadedFile> {
  const result = await readPdf(new File([bytes], name));
  if (!result.ok) throw new Error(`${name} rejected: ${result.reason}`);
  return result.file;
}

/** All text drawn on a page, read back out of its content streams. */
export function pageText(doc: PDFDocument, page: PDFPage): string {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => doc.context.lookup(ref)) : [contents];
  let out = '';
  for (const stream of streams) {
    if (!(stream instanceof PDFRawStream)) continue;
    const source = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    for (const match of source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out += `${Buffer.from(match[1], 'hex').toString('latin1')}\n`;
    for (const match of source.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out += `${match[1]}\n`;
  }
  return out;
}

export function footerOf(doc: PDFDocument, page: PDFPage): string | undefined {
  return pageText(doc, page)
    .split('\n')
    .find((line) => /\| Page \d+ of \d+$/.test(line));
}

/** A one-page-per-entry PDF whose pages say what they are, for order checks. */
export async function labelled(label: string, pages = 1, size: [number, number] = [595, 842]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(size);
    page.drawRectangle({ x: 0, y: 0, width: size[0], height: size[1], color: rgb(0.9, 0.95, 1) });
    page.drawText(`${label} page ${i}`, { x: Math.min(40, size[0] / 6), y: size[1] / 2, size: Math.min(18, size[0] / 12), font });
  }
  return doc.save();
}

/** Pages that are awkward on purpose: rotated, cropped, offset, tiny, blank. */
export async function awkward(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const filled = (page: PDFPage) => {
    const box = page.getMediaBox();
    page.drawRectangle({ ...box, color: rgb(0.85, 0.9, 1) });
    page.drawText('content', { x: box.x + 20, y: box.y + box.height / 2, size: 10, font });
  };
  for (const angle of [90, 180, 270]) {
    const page = doc.addPage([595, 842]);
    filled(page);
    page.setRotation(degrees(angle));
  }
  const offset = doc.addPage([595, 842]);
  offset.setMediaBox(-100, -50, 595, 842);
  filled(offset);
  const cropped = doc.addPage([700, 900]);
  filled(cropped);
  cropped.setCropBox(50, 60, 500, 700);
  const tiny = doc.addPage([144, 72]);
  filled(tiny);
  doc.addPage([842, 1191]); // blank: no content stream at all
  return doc.save();
}

/** A filled-in form, as a certificate completed in a PDF editor would be. */
export async function filledForm(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const field = doc.getForm().createTextField('holder');
  field.setText('Meghna Tech Solutions Ltd.');
  field.addToPage(page, { x: 60, y: 600, width: 300, height: 24 });
  return doc.save();
}
