import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  StandardFonts,
  concatTransformationMatrix,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { Row, Tender, UploadedFile } from '../types';

export interface PackageEntry {
  title: string;
  file: UploadedFile;
  startPage: number;
  endPage: number;
}

export class PackageError extends Error {
  constructor(public fileName: string) {
    super(`Could not read ${fileName}`);
  }
}

const A4: [number, number] = [595.28, 841.89];
/** Height reserved at the bottom of every page for the footer. */
const BAND = 28;
const MARGIN = 56;

const INK = rgb(0.106, 0.102, 0.09);
const INK_2 = rgb(0.361, 0.345, 0.31);
const RULE = rgb(0.812, 0.788, 0.737);
const SEAL = rgb(0.141, 0.22, 0.612);

export const packageFileName = (tender: Tender): string =>
  `${tender.tender_id.replace(/[\\/:*?"<>|]/g, '_')}_Package.pdf`;

export function entriesFromRows(rows: Row[]): PackageEntry[] {
  return rows.flatMap((row) =>
    row.file && row.startPage !== null && row.endPage !== null
      ? [{ title: row.requirement.title_en, file: row.file, startPage: row.startPage, endPage: row.endPage }]
      : [],
  );
}

export const totalPages = (entries: PackageEntry[]): number =>
  1 + entries.reduce((sum, entry) => sum + entry.file.pages, 0);

/** The built-in PDF fonts only cover Latin-1; anything else becomes "?". */
function safe(font: PDFFont, value: string): string {
  return Array.from(value.replace(/\s+/g, ' '), (ch) => {
    try {
      font.widthOfTextAtSize(ch, 10);
      return ch;
    } catch {
      return '?';
    }
  }).join('');
}

function fit(font: PDFFont, value: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).map((l) => fit(font, l, size, maxWidth));
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return iso;
  const pretty = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  return `${pretty} (${iso})`;
}

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const rotationOf = (page: PDFPage): 0 | 90 | 180 | 270 =>
  ((((Math.round(page.getRotation().angle / 90) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;

/**
 * Shrinks the existing page content slightly towards the top so a blank band
 * opens at the visual bottom. The footer goes in that band, so it can never
 * sit on top of the document's own content. Annotations move with the content.
 */
function reserveFooterBand(doc: PDFDocument, page: PDFPage): void {
  const rot = rotationOf(page);
  const { x, y, width: w, height: h } = page.getCropBox();
  const visualHeight = rot === 90 || rot === 270 ? w : h;
  if (visualHeight <= BAND * 4) return;

  const s = (visualHeight - BAND) / visualHeight;
  let tx: number;
  let ty: number;
  if (rot === 0 || rot === 180) {
    tx = x + (w - s * w) / 2 - s * x;
    ty = rot === 0 ? y + BAND - s * y : y - s * y;
  } else {
    tx = rot === 90 ? x - s * x : x + BAND - s * x;
    ty = y + (h - s * h) / 2 - s * y;
  }

  page.node.normalize();
  const context = doc.context;
  const start = context.register(
    context.contentStream([pushGraphicsState(), concatTransformationMatrix(s, 0, 0, s, tx, ty)]),
  );
  const end = context.register(context.contentStream([popGraphicsState()]));
  page.node.wrapContentStreams(start, end);

  try {
    const annots = page.node.Annots();
    for (let i = 0; annots && i < annots.size(); i++) {
      const annot = annots.lookupMaybe(i, PDFDict);
      const rect = annot?.lookupMaybe(PDFName.of('Rect'), PDFArray);
      if (!annot || !rect || rect.size() !== 4) continue;
      const [x1, y1, x2, y2] = [0, 1, 2, 3].map((n) => rect.lookup(n, PDFNumber).asNumber());
      annot.set(PDFName.of('Rect'), context.obj([s * x1 + tx, s * y1 + ty, s * x2 + tx, s * y2 + ty]));
    }
  } catch {
    // Unusual annotation data: leave it where it is rather than fail the package.
  }
}

/** Draws the footer along the visual bottom edge, whatever the page rotation. */
function drawFooter(page: PDFPage, font: PDFFont, label: string): void {
  const rot = rotationOf(page);
  const box = page.getCropBox();
  const visualWidth = rot === 90 || rot === 270 ? box.height : box.width;
  // (u, v) = distance from the visual left / bottom edge -> page coordinates.
  const at = (u: number, v: number) => {
    if (rot === 90) return { x: box.x + box.width - v, y: box.y + u };
    if (rot === 180) return { x: box.x + box.width - u, y: box.y + box.height - v };
    if (rot === 270) return { x: box.x + v, y: box.y + box.height - u };
    return { x: box.x + u, y: box.y + v };
  };

  const size = 9;
  const inset = Math.min(36, visualWidth * 0.06);
  const text = fit(font, label, size, visualWidth - inset * 2);
  const width = font.widthOfTextAtSize(text, size);
  page.drawLine({ start: at(inset, BAND - 5), end: at(visualWidth - inset, BAND - 5), thickness: 0.5, color: RULE });
  page.drawText(text, { ...at((visualWidth - width) / 2, 9), size, font, color: INK_2, rotate: degrees(rot) });
}

function drawCover(
  page: PDFPage,
  tender: Tender,
  entries: PackageEntry[],
  regular: PDFFont,
  bold: PDFFont,
): void {
  const [width, height] = A4;
  const contentWidth = width - MARGIN * 2;
  let y = height - 84;

  page.drawText('TENDER DOCUMENT PACKAGE', { x: MARGIN, y, size: 9, font: bold, color: SEAL });
  y -= 38;
  for (const line of wrap(bold, safe(bold, tender.title), 24, contentWidth)) {
    page.drawText(line, { x: MARGIN, y, size: 24, font: bold, color: INK });
    y -= 30;
  }
  y -= 4;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.75, color: RULE });
  y -= 28;

  const fields: [string, string][] = [
    ['Tender ID', tender.tender_id],
    ['Procuring entity', tender.procuring_entity],
    ['Bidder', tender.bidder],
    ['Submission deadline', longDate(tender.submission_deadline)],
    ['Package prepared on', longDate(todayIso())],
  ];
  for (const [label, value] of fields) {
    page.drawText(label, { x: MARGIN, y, size: 9.5, font: regular, color: INK_2 });
    page.drawText(fit(regular, safe(regular, value), 11, contentWidth - 150), {
      x: MARGIN + 150,
      y,
      size: 11,
      font: label === 'Tender ID' ? bold : regular,
      color: INK,
    });
    y -= 22;
  }

  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.75, color: RULE });
  y -= 26;
  page.drawText(`Included documents (${entries.length})`, { x: MARGIN, y, size: 11, font: bold, color: INK });
  y -= 24;

  // Up to 30 documents must fit above the footer, so the list tightens as it grows.
  const available = y - (BAND + 28);
  const lineHeight = Math.min(20, available / Math.max(entries.length, 1));
  const size = Math.max(6, Math.min(10.5, lineHeight * 0.62));
  entries.forEach((entry, index) => {
    const pages = entry.file.pages === 1 ? '1 page' : `${entry.file.pages} pages`;
    const pagesWidth = regular.widthOfTextAtSize(pages, size);
    page.drawText(`${index + 1}.`, { x: MARGIN, y, size, font: regular, color: INK_2 });
    page.drawText(fit(regular, safe(regular, entry.title), size, contentWidth - 28 - pagesWidth - 16), {
      x: MARGIN + 28,
      y,
      size,
      font: regular,
      color: INK,
    });
    page.drawText(pages, { x: width - MARGIN - pagesWidth, y, size, font: regular, color: INK_2 });
    y -= lineHeight;
  });
}

/**
 * Section 6: cover page, then every matched document in tender order with all
 * of its pages, and "<tender_id> | Page X of Y" at the bottom of every page.
 */
export async function buildPackage(
  tender: Tender,
  entries: PackageEntry[],
  onProgress: (page: number, total: number) => void = () => {},
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const regular = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const total = totalPages(entries);
  const tenderId = safe(regular, tender.tender_id);
  const footer = (n: number) => `${tenderId} | Page ${n} of ${total}`;

  const cover = out.addPage(A4);
  drawCover(cover, tender, entries, regular, bold);
  drawFooter(cover, regular, footer(1));
  let pageNumber = 1;
  onProgress(pageNumber, total);

  for (const entry of entries) {
    try {
      const source = await PDFDocument.load(entry.file.bytes, { updateMetadata: false });
      const copied = await out.copyPages(source, source.getPageIndices());
      for (const copy of copied) {
        const page = out.addPage(copy);
        pageNumber += 1;
        reserveFooterBand(out, page);
        drawFooter(page, regular, footer(pageNumber));
      }
    } catch {
      throw new PackageError(entry.file.name);
    }
    onProgress(pageNumber, total);
    // Let the browser paint the progress between documents.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  out.setTitle(`${tender.tender_id} Package`);
  out.setSubject(tender.title);
  out.setAuthor(tender.bidder);
  return out.save();
}
