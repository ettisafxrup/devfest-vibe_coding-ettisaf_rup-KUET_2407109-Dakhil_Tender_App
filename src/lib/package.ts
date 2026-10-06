import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  StandardFonts,
  clip,
  concatTransformationMatrix,
  degrees,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setCharacterSpacing,
  type Color,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { Row, Tender, UploadedFile } from '../types';
import { PARSE_OPTIONS } from './files';

export interface PackageEntry {
  title: string;
  file: UploadedFile;
  startPage: number;
  endPage: number;
}

export class PackageError extends Error {
  fileName: string;
  constructor(fileName: string) {
    super(`Could not read ${fileName}`);
    this.fileName = fileName;
  }
}

interface Fonts {
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Faint mark across the cover page (the only page this app authors itself). */
export const COVER_WATERMARK = 'ETTISAF RUP DEVFEST';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 64;
/** Footer text size and band height on a normal page; both shrink on very small pages. */
const FOOTER_SIZE = 9;
const BAND_RATIO = 28 / FOOTER_SIZE;

const INK = rgb(0.086, 0.094, 0.114);
const INK_2 = rgb(0.306, 0.318, 0.349);
const RULE = rgb(0.812, 0.788, 0.737);
const SUNKEN = rgb(0.937, 0.925, 0.898);
const SEAL = rgb(0.114, 0.247, 0.561);

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

/* ---------- Text helpers ---------- */

/** The built-in PDF fonts only cover Latin-1; anything else becomes "?". */
function safe(font: PDFFont, value: string): string {
  return Array.from(value.replace(/\s+/g, ' ').trim(), (ch) => {
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

/** Word-wraps to a width; over-long words are broken, and text past maxLines ends in "...". */
function wrapText(font: PDFFont, value: string, size: number, maxWidth: number, maxLines: number): string[] {
  const width = (s: string) => font.widthOfTextAtSize(s, size);
  const words = value.split(' ').flatMap((word) => {
    const pieces: string[] = [];
    let piece = '';
    for (const ch of word) {
      if (piece && width(piece + ch) > maxWidth) {
        pieces.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    return piece ? [...pieces, piece] : pieces;
  });

  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length === 0) return ['-'];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fit(font, `${kept[maxLines - 1]} ${lines[maxLines]}`, size, maxWidth - width('...'))
    .replace(/\.\.\.$/, '')
    .trimEnd()
    .concat('...');
  return kept;
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

/* ---------- Page geometry ---------- */

const rotationOf = (page: PDFPage): 0 | 90 | 180 | 270 =>
  ((((Math.round(page.getRotation().angle / 90) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;

const normalized = (box: Box): Box => ({
  x: Math.min(box.x, box.x + box.width),
  y: Math.min(box.y, box.y + box.height),
  width: Math.abs(box.width),
  height: Math.abs(box.height),
});

/** The part of the page a viewer shows: the crop box, limited to the media box. */
function visibleBox(page: PDFPage): Box {
  const media = normalized(page.getMediaBox());
  const crop = normalized(page.getCropBox());
  const x1 = Math.max(media.x, crop.x);
  const y1 = Math.max(media.y, crop.y);
  const x2 = Math.min(media.x + media.width, crop.x + crop.width);
  const y2 = Math.min(media.y + media.height, crop.y + crop.height);
  return x2 - x1 > 1 && y2 - y1 > 1 ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : media;
}

interface FooterLayout {
  rot: 0 | 90 | 180 | 270;
  box: Box;
  visualWidth: number;
  visualHeight: number;
  inset: number;
  size: number;
  band: number;
}

/** Sizes the footer for this page so the full label always fits on one line. */
function footerLayout(page: PDFPage, font: PDFFont, label: string): FooterLayout {
  const rot = rotationOf(page);
  const box = visibleBox(page);
  const sideways = rot === 90 || rot === 270;
  const visualWidth = sideways ? box.height : box.width;
  const visualHeight = sideways ? box.width : box.height;
  const inset = Math.min(36, visualWidth * 0.06);
  const size = Math.min(FOOTER_SIZE, (visualWidth - inset * 2) / font.widthOfTextAtSize(label, 1));
  const band = Math.min(size * BAND_RATIO, visualHeight * 0.25);
  return { rot, box, visualWidth, visualHeight, inset, size, band };
}

/** Geometry keys of annotations that hold x,y pairs in page coordinates. */
const POINT_LISTS = ['Rect', 'QuadPoints', 'Vertices', 'L', 'CL'];

/**
 * Shrinks the existing page content slightly towards the top so a blank band
 * opens at the visual bottom. The footer goes in that band, so it can never
 * sit on top of the document's own content. Annotations move with the content.
 */
function reserveFooterBand(doc: PDFDocument, page: PDFPage, layout: FooterLayout): void {
  const { rot, box, visualHeight, band } = layout;
  const { x, y, width: w, height: h } = box;
  const s = (visualHeight - band) / visualHeight;
  let tx: number;
  let ty: number;
  if (rot === 0 || rot === 180) {
    tx = x + (w - s * w) / 2 - s * x;
    ty = rot === 0 ? y + band - s * y : y - s * y;
  } else {
    tx = rot === 90 ? x - s * x : x + band - s * x;
    ty = y + (h - s * h) / 2 - s * y;
  }

  page.node.normalize();
  const context = doc.context;
  // The clip keeps anything that was outside the visible page (bleed, crop marks)
  // from sliding into the new margins and the footer band.
  const start = context.register(
    context.contentStream([
      pushGraphicsState(),
      concatTransformationMatrix(s, 0, 0, s, tx, ty),
      rectangle(x, y, w, h),
      clip(),
      endPath(),
    ]),
  );
  const end = context.register(context.contentStream([popGraphicsState()]));
  page.node.wrapContentStreams(start, end);

  const move = (list: PDFArray): number[] | null => {
    const out: number[] = [];
    for (let i = 0; i < list.size(); i++) {
      const n = list.lookupMaybe(i, PDFNumber);
      if (!n) return null;
      out.push(s * n.asNumber() + (i % 2 === 0 ? tx : ty));
    }
    return out;
  };

  try {
    const annots = page.node.Annots();
    for (let i = 0; annots && i < annots.size(); i++) {
      const annot = annots.lookupMaybe(i, PDFDict);
      if (!annot) continue;
      for (const key of POINT_LISTS) {
        const list = annot.lookupMaybe(PDFName.of(key), PDFArray);
        const moved = list && list.size() % 2 === 0 ? move(list) : null;
        if (moved) annot.set(PDFName.of(key), context.obj(moved));
      }
      const ink = annot.lookupMaybe(PDFName.of('InkList'), PDFArray);
      if (ink) {
        const strokes: number[][] = [];
        for (let j = 0; j < ink.size(); j++) {
          const stroke = ink.lookupMaybe(j, PDFArray);
          const moved = stroke ? move(stroke) : null;
          if (moved) strokes.push(moved);
        }
        if (strokes.length === ink.size()) annot.set(PDFName.of('InkList'), context.obj(strokes));
      }
    }
  } catch {
    // Unusual annotation data: leave it where it is rather than fail the package.
  }
}

/** Draws the footer along the visual bottom edge, whatever the page rotation. */
function drawFooter(page: PDFPage, font: PDFFont, label: string, layout: FooterLayout): void {
  const { rot, box, visualWidth, inset, size, band } = layout;
  // (u, v) = distance from the visual left / bottom edge -> page coordinates.
  const at = (u: number, v: number) => {
    if (rot === 90) return { x: box.x + box.width - v, y: box.y + u };
    if (rot === 180) return { x: box.x + box.width - u, y: box.y + box.height - v };
    if (rot === 270) return { x: box.x + v, y: box.y + box.height - u };
    return { x: box.x + u, y: box.y + v };
  };
  const width = font.widthOfTextAtSize(label, size);
  const ruleAt = band * (23 / 28);
  page.drawLine({ start: at(inset, ruleAt), end: at(visualWidth - inset, ruleAt), thickness: 0.5, color: RULE });
  page.drawText(label, {
    ...at((visualWidth - width) / 2, band * (9 / 28)),
    size,
    font,
    color: INK_2,
    rotate: degrees(rot),
  });
}

/* ---------- Cover page ---------- */

function drawCover(
  page: PDFPage,
  tender: Tender,
  entries: PackageEntry[],
  total: number,
  fonts: Fonts,
  footerBand: number,
): void {
  const { sans, sansBold, serif, serifBold } = fonts;
  const [W, H] = A4;
  const contentWidth = W - MARGIN * 2;
  const frameBottom = footerBand + 14;
  const floor = frameBottom + 26;

  // Watermark first, so everything else sits on top of it.
  const markSize = 46;
  const markWidth = sansBold.widthOfTextAtSize(COVER_WATERMARK, markSize);
  const angle = (52 * Math.PI) / 180;
  page.drawText(COVER_WATERMARK, {
    x: W / 2 - (markWidth / 2) * Math.cos(angle) + markSize * 0.35 * Math.sin(angle),
    y: (H + frameBottom) / 2 - (markWidth / 2) * Math.sin(angle) - markSize * 0.35 * Math.cos(angle),
    size: markSize,
    font: sansBold,
    color: SEAL,
    opacity: 0.055,
    rotate: degrees(52),
  });

  // Double-ruled frame, as on a formal submission.
  page.drawRectangle({ x: 28, y: frameBottom, width: W - 56, height: H - 28 - frameBottom, borderColor: INK, borderWidth: 0.9 });
  page.drawRectangle({ x: 32, y: frameBottom + 4, width: W - 64, height: H - 36 - frameBottom, borderColor: INK, borderWidth: 0.3 });

  const title = safe(serifBold, tender.title) || 'Tender';
  const tenderId = safe(sans, tender.tender_id);
  const entity = safe(serif, tender.procuring_entity);
  const bidder = safe(serif, tender.bidder);
  const facts: [string, string][] = [
    ['SUBMISSION DEADLINE', longDate(tender.submission_deadline)],
    ['PACKAGE PREPARED ON', longDate(todayIso())],
    ['TOTAL PAGES', `${total} (${entries.length} ${entries.length === 1 ? 'document' : 'documents'})`],
  ];

  /** Lays the cover out at scale k; draws only when `paint` is set. Returns the lowest y used. */
  const layout = (k: number, paint: boolean): number => {
    const text = (value: string, x: number, y: number, size: number, font: PDFFont, color: Color = INK) => {
      if (paint) page.drawText(value, { x, y, size, font, color });
    };
    const tracked = (value: string, x: number, y: number, size: number, color: Color, align: 'left' | 'center') => {
      const spacing = size * 0.16;
      const width = sansBold.widthOfTextAtSize(value, size) + spacing * (value.length - 1);
      if (!paint) return;
      page.pushOperators(setCharacterSpacing(spacing));
      page.drawText(value, { x: align === 'center' ? x - width / 2 : x, y, size, font: sansBold, color });
      page.pushOperators(setCharacterSpacing(0));
    };
    const centered = (value: string, y: number, size: number, font: PDFFont, color: Color = INK) =>
      text(value, W / 2 - font.widthOfTextAtSize(value, size) / 2, y, size, font, color);
    const rule = (y: number, x1 = MARGIN, x2 = W - MARGIN, thickness = 0.6, color: Color = RULE) => {
      if (paint) page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
    };

    let y = H - 96;
    tracked('TENDER SUBMISSION PACKAGE', W / 2, y, 9.5, SEAL, 'center');

    y -= 18 + 26 * k;
    for (const line of wrapText(serifBold, title, 26 * k, contentWidth, 4)) {
      centered(line, y, 26 * k, serifBold);
      y -= 31 * k;
    }
    y += 12 * k;
    rule(y, W / 2 - 36, W / 2 + 36, 1.2, SEAL);
    y -= 22 * k;
    centered(fit(sans, `Tender No. ${tenderId}`, 11.5 * k, contentWidth), y, 11.5 * k, sans, INK_2);

    // Who it goes to, and who it comes from.
    y -= 40 * k;
    const column = (contentWidth - 28) / 2;
    const parties: [string, string[]][] = [
      ['PROCURING ENTITY', wrapText(serif, entity, 13 * k, column, 4)],
      ['SUBMITTED BY', wrapText(serif, bidder, 13 * k, column, 4)],
    ];
    parties.forEach(([label, lines], index) => {
      const x = MARGIN + index * (column + 28);
      tracked(label, x, y, 7.5, INK_2, 'left');
      lines.forEach((line, n) => text(line, x, y - 18 * k - n * 16 * k, 13 * k, serif));
    });
    y -= 18 * k + Math.max(...parties.map(([, lines]) => lines.length)) * 16 * k + 12 * k;

    // Key facts in a ruled strip.
    rule(y, MARGIN, W - MARGIN, 0.6, INK);
    const cell = contentWidth / facts.length;
    facts.forEach(([label, value], index) => {
      const x = MARGIN + index * cell;
      tracked(label, x, y - 16 * k, 7.5, INK_2, 'left');
      text(fit(sans, value, 10.5 * k, cell - 10), x, y - 31 * k, 10.5 * k, sans);
    });
    y -= 42 * k;
    rule(y, MARGIN, W - MARGIN, 0.6, INK);

    // Schedule of documents.
    y -= 30 * k;
    tracked('SCHEDULE OF DOCUMENTS', MARGIN, y, 8.5, INK, 'left');
    y -= 10 * k;
    const headHeight = 20 * k;
    if (paint) page.drawRectangle({ x: MARGIN, y: y - headHeight, width: contentWidth, height: headHeight, color: SUNKEN });
    const size = 10 * k;
    const numberX = MARGIN + 8;
    const titleX = MARGIN + 40;
    const rightX = W - MARGIN - 8;
    const titleWidth = rightX - titleX - 70;
    const right = (value: string, yy: number, font: PDFFont, color: Color = INK) =>
      text(value, rightX - font.widthOfTextAtSize(value, size * 0.9), yy, size * 0.9, font, color);
    text('No.', numberX, y - headHeight + 6.5 * k, size * 0.9, sansBold, INK_2);
    text('Document', titleX, y - headHeight + 6.5 * k, size * 0.9, sansBold, INK_2);
    right('Pages', y - headHeight + 6.5 * k, sansBold, INK_2);
    y -= headHeight;

    entries.forEach((entry, index) => {
      const lines = wrapText(sans, safe(sans, entry.title), size, titleWidth, 2);
      const rowHeight = lines.length * 13 * k + 8 * k;
      const baseline = y - 14 * k;
      text(String(index + 1), numberX, baseline, size, sans, INK_2);
      lines.forEach((line, n) => text(line, titleX, baseline - n * 13 * k, size, sans));
      right(entry.startPage === entry.endPage ? `${entry.startPage}` : `${entry.startPage}-${entry.endPage}`, baseline, sans);
      y -= rowHeight;
      rule(y);
    });
    if (entries.length === 0) {
      text('No documents included.', titleX, y - 14 * k, size, sans, INK_2);
      y -= 22 * k;
      rule(y);
    }
    return y;
  };

  // Largest scale at which everything stays above the footer.
  let scale = 1;
  while (scale > 0.4 && layout(scale, false) < floor) scale -= 0.05;
  layout(scale, true);
}

/* ---------- Assembly ---------- */

/**
 * Opens a source document for copying. Filled-in form fields are flattened
 * first: copied pages lose the form definition, and without it some viewers
 * show the fields empty.
 */
async function openSource(bytes: Uint8Array): Promise<PDFDocument> {
  const doc = await PDFDocument.load(bytes, PARSE_OPTIONS);
  if (!doc.catalog.has(PDFName.of('AcroForm'))) return doc;
  try {
    const form = doc.getForm();
    if (form.getFields().length === 0) return doc;
    form.flatten();
    // flatten() paints each field onto its page but leaves dead references to the
    // old field boxes in the page's annotation list; clear those out.
    const widget = PDFName.of('Widget');
    for (const page of doc.getPages()) {
      const annots = page.node.Annots();
      for (let i = (annots?.size() ?? 0) - 1; annots && i >= 0; i--) {
        const annot = doc.context.lookup(annots.get(i));
        const gone = !(annot instanceof PDFDict);
        if (gone || annot.get(PDFName.of('Subtype')) === widget) annots.remove(i);
      }
    }
    return doc;
  } catch {
    // A form pdf-lib cannot flatten: copy the pages as they are instead.
    return PDFDocument.load(bytes, PARSE_OPTIONS);
  }
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
  const fonts: Fonts = {
    sans: await out.embedFont(StandardFonts.Helvetica),
    sansBold: await out.embedFont(StandardFonts.HelveticaBold),
    serif: await out.embedFont(StandardFonts.TimesRoman),
    serifBold: await out.embedFont(StandardFonts.TimesRomanBold),
  };

  // Count pages from the documents themselves, so "of Y" is always the real total.
  const sources: { entry: PackageEntry; pages: number }[] = [];
  for (const entry of entries) sources.push({ entry, pages: entry.file.pages });
  const total = 1 + sources.reduce((sum, source) => sum + source.pages, 0);
  const tenderId = safe(fonts.sans, tender.tender_id);
  const footer = (n: number) => `${tenderId} | Page ${n} of ${total}`;

  const cover = out.addPage(A4);
  const coverFooter = footerLayout(cover, fonts.sans, footer(1));
  drawCover(cover, tender, entries, total, fonts, coverFooter.band);
  drawFooter(cover, fonts.sans, footer(1), coverFooter);
  let pageNumber = 1;
  onProgress(pageNumber, total);

  for (const { entry, pages } of sources) {
    try {
      const source = await openSource(entry.file.bytes);
      if (source.getPageCount() !== pages) throw new Error('Page count changed');
      const copied = await out.copyPages(source, source.getPageIndices());
      for (const copy of copied) {
        const page = out.addPage(copy);
        pageNumber += 1;
        const label = footer(pageNumber);
        const layout = footerLayout(page, fonts.sans, label);
        reserveFooterBand(out, page, layout);
        drawFooter(page, fonts.sans, label, layout);
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
  out.setCreator('Dakhil');
  return out.save();
}
