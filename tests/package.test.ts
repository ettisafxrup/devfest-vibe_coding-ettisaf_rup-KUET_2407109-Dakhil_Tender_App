import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { COVER_WATERMARK, buildPackage, entriesFromRows, packageFileName, totalPages, type PackageEntry } from '../src/lib/package';
import { parseRequirements } from '../src/lib/requirements';
import { buildRows } from '../src/lib/status';
import type { Tender, UploadedFile } from '../src/types';
import { PACK, awkward, filledForm, footerOf, labelled, packFile, pageText, upload } from './helpers';

const tender: Tender = {
  tender_id: 'T-2026-0417',
  title: 'Supply of IT Equipment',
  procuring_entity: 'Directorate of Sample Services',
  bidder: 'Meghna Tech Solutions Ltd.',
  submission_deadline: '2026-10-20',
};

/** Gives files consecutive page ranges, as the checklist does. */
function entriesFor(files: UploadedFile[], titles?: string[]): PackageEntry[] {
  let next = 2;
  return files.map((file, i) => {
    const entry = { title: titles?.[i] ?? file.name, file, startPage: next, endPage: next + file.pages - 1 };
    next += file.pages;
    return entry;
  });
}

const open = async (bytes: Uint8Array) => PDFDocument.load(bytes);

describe('the generated package (problem statement, section 6)', () => {
  it('builds the sample pack: cover, documents in tender order, every page numbered', async () => {
    const { tender: sampleTender, requirements } = parseRequirements(readFileSync(new URL('requirements.json', PACK), 'utf8'));
    const picks: Record<string, string> = {
      R01: 'trade_license_2026.pdf',
      R02: '03_tin_certificate.pdf',
      R03: '04_vat_certificate.pdf',
      R04: 'bank_solvency.pdf',
      R05: 'experience_cert.pdf',
      R08: '02_technical_proposal.pdf',
      R09: '01_financial_proposal.pdf',
      R10: 'scan_0042.pdf',
    };
    const files: UploadedFile[] = [];
    const matches: Record<string, string> = {};
    for (const [id, name] of Object.entries(picks)) {
      const file = await upload(name, Buffer.from(await packFile(name).arrayBuffer()));
      files.push(file);
      matches[id] = file.id;
    }
    const rows = buildRows(requirements, files, matches, {}, sampleTender.submission_deadline);
    const entries = entriesFromRows(rows);
    expect(totalPages(entries)).toBe(16);

    const doc = await open(await buildPackage(sampleTender, entries));
    const pages = doc.getPages();
    expect(pages).toHaveLength(16);
    pages.forEach((page, index) => expect(footerOf(doc, page)).toBe(`T-2026-0417 | Page ${index + 1} of 16`));

    const cover = pageText(doc, pages[0]);
    for (const expected of ['T-2026-0417', 'Supply of IT Equipment', 'Directorate of Sample Services', 'Meghna Tech Solutions Ltd.', '2026-10-20', COVER_WATERMARK]) {
      expect(cover).toContain(expected);
    }
    // Included documents, in order, with optional ones that have no file left out.
    const listed = ['Trade License', 'TIN Certificate', 'VAT Registration Certificate', 'Bank Solvency Certificate', 'Experience Certificate', 'Technical Proposal', 'Financial Proposal', 'Signed Declaration'];
    const positions = listed.map((title) => cover.indexOf(title));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(cover).not.toContain('Audited Financial Statement');
    expect(cover).not.toContain("Manufacturer's Authorization");

    // Pages land where the checklist said they would.
    expect(pageText(doc, pages[1])).toContain('TRADE LICENSE');
    expect(pageText(doc, pages[4])).toContain('BANK SOLVENCY CERTIFICATE');
    expect(pageText(doc, pages[13])).toContain('Price Schedule');
    expect(packageFileName(sampleTender)).toBe('T-2026-0417_Package.pdf');
  });

  it('keeps every page of every file, in order', async () => {
    const files = [await upload('b.pdf', await labelled('B', 3)), await upload('a.pdf', await labelled('A', 2))];
    const doc = await open(await buildPackage(tender, entriesFor(files)));
    const body = doc.getPages().slice(1).map((page) => pageText(doc, page).split('\n')[0]);
    expect(body).toEqual(['B page 1', 'B page 2', 'B page 3', 'A page 1', 'A page 2']);
  });

  it('makes a cover-only package when nothing optional was provided', async () => {
    const doc = await open(await buildPackage(tender, []));
    expect(doc.getPageCount()).toBe(1);
    expect(footerOf(doc, doc.getPage(0))).toBe('T-2026-0417 | Page 1 of 1');
  });

  it('numbers rotated, cropped, offset, tiny and blank pages, and keeps their size', async () => {
    const file = await upload('awkward.pdf', await awkward());
    const doc = await open(await buildPackage(tender, entriesFor([file])));
    const pages = doc.getPages();
    expect(pages).toHaveLength(8);
    pages.forEach((page, index) => expect(footerOf(doc, page)).toBe(`T-2026-0417 | Page ${index + 1} of 8`));
    expect(pages.slice(1).map((p) => p.getRotation().angle)).toEqual([90, 180, 270, 0, 0, 0, 0]);
    expect(pages[4].getMediaBox()).toMatchObject({ x: -100, y: -50, width: 595, height: 842 });
    expect(pages[5].getCropBox()).toMatchObject({ x: 50, y: 60, width: 500, height: 700 });
    expect(pages[6].getMediaBox()).toMatchObject({ width: 144, height: 72 });
  });

  it('keeps filled-in form values visible', async () => {
    const file = await upload('form.pdf', await filledForm());
    const doc = await open(await buildPackage(tender, entriesFor([file])));
    expect(doc.getPageCount()).toBe(2);
    // Flattened: the value is part of the page now, not a field that needs a form definition.
    expect(doc.getPage(1).node.Annots()?.size() ?? 0).toBe(0);
    const resources = doc.getPage(1).node.Resources();
    expect(resources?.lookup(PDFName.of('XObject'))).toBeDefined();
  });

  it('survives long, empty and non-Latin tender details', async () => {
    const long = 'Procurement of Information Technology Equipment and Associated Services '.repeat(6).trim();
    const odd: Tender = {
      tender_id: 'টেন্ডার/2026:04*17',
      title: long,
      procuring_entity: `${long} Directorate`,
      bidder: '',
      submission_deadline: '2026-10-20',
    };
    const files = await Promise.all(Array.from({ length: 30 }, (_, i) => labelled(`D${i}`).then((bytes) => upload(`d${i}.pdf`, bytes))));
    const titles = files.map((_, i) => (i % 2 ? `${long} ${i}` : `অভিজ্ঞতার সনদ ${i}`));
    const doc = await open(await buildPackage(odd, entriesFor(files, titles)));
    expect(doc.getPageCount()).toBe(31);
    const footers = doc.getPages().map((page) => footerOf(doc, page));
    expect(footers.every((f, i) => f?.endsWith(`| Page ${i + 1} of 31`))).toBe(true);
    expect(packageFileName(odd)).toBe('টেন্ডার_2026_04_17_Package.pdf');
  });

  it('prints long dates and tender ids on the cover in full', async () => {
    const wordy: Tender = { ...tender, tender_id: 'DGHS/ICT/2026-27/GD-014 (Re-tender) Lot 3 of 7 - Supply, Installation and Commissioning', submission_deadline: '2026-09-30' };
    const doc = await open(await buildPackage(wordy, []));
    const cover = pageText(doc, doc.getPage(0));
    expect(cover).toContain('30 September 2026 (2026-09-30)');
    expect(cover).toContain(`Tender No. ${wordy.tender_id}`);
    expect(footerOf(doc, doc.getPage(0))).toBe(`${wordy.tender_id} | Page 1 of 1`);
  });

  it('names the file that could not be read', async () => {
    const good = await upload('good.pdf', await labelled('G'));
    const bad: UploadedFile = { ...good, id: 'bad', name: 'bad.pdf', bytes: new TextEncoder().encode('%PDF-1.7 broken') };
    await expect(buildPackage(tender, entriesFor([good, bad]))).rejects.toMatchObject({ fileName: 'bad.pdf' });
  });

  it('reports progress up to the last page', async () => {
    const files = [await upload('a.pdf', await labelled('A', 2)), await upload('b.pdf', await labelled('B', 1))];
    const seen: [number, number][] = [];
    await buildPackage(tender, entriesFor(files), (page, total) => seen.push([page, total]));
    expect(seen[0]).toEqual([1, 4]);
    expect(seen[seen.length - 1]).toEqual([4, 4]);
  });
});
