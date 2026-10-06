import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { filesFromEntries, type DroppedEntry } from '../src/lib/dnd';
import { MAX_FILES, MAX_TOTAL_BYTES, contentHash, hasPdfHeader, readPdf, sha256Fallback } from '../src/lib/files';
import { findDuplicateConflict, initialState, reducer, type State } from '../src/state/useProject';
import type { Requirement, UploadedFile } from '../src/types';
import { labelled, packFile, packFileNames } from './helpers';

const reasonOf = async (file: File) => {
  const result = await readPdf(file);
  return result.ok ? 'ok' : result.reason;
};

describe('reading uploaded files', () => {
  it('accepts every PDF in the sample pack and rejects the PNG', async () => {
    const outcomes: Record<string, string> = {};
    for (const name of packFileNames()) outcomes[name] = await reasonOf(packFile(name));
    expect(outcomes['company_logo.png']).toBe('notPdf');
    expect(Object.entries(outcomes).filter(([, r]) => r !== 'ok')).toEqual([['company_logo.png', 'notPdf']]);
  });
  it('counts pages', async () => {
    const pages: Record<string, number> = {};
    for (const name of ['01_financial_proposal.pdf', '02_technical_proposal.pdf', 'scan_0042.pdf']) {
      const result = await readPdf(packFile(name));
      if (result.ok) pages[name] = result.file.pages;
    }
    expect(pages).toEqual({ '01_financial_proposal.pdf': 2, '02_technical_proposal.pdf': 6, 'scan_0042.pdf': 1 });
  });
  it('judges by content, not by file name', async () => {
    expect(await reasonOf(new File(['just text'], 'fake.pdf'))).toBe('notPdf');
    expect(await reasonOf(new File([], 'empty.pdf'))).toBe('notPdf');
    expect(await reasonOf(new File([await labelled('x')], 'no-extension'))).toBe('ok');
  });
  it('reports a damaged PDF instead of crashing', async () => {
    const good = await labelled('x', 3);
    expect(await reasonOf(new File(['%PDF-1.7 nonsense'], 'junk.pdf'))).toBe('damaged');
    expect(await reasonOf(new File([good.slice(0, 200)], 'truncated.pdf'))).toBe('damaged');
  });
  it('reports a password-protected PDF', async () => {
    const encrypted = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
4 0 obj<</Filter/Standard/V 1/R 2/O(aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)/U(bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)/P -44>>endobj
trailer<</Root 1 0 R/Size 5/Encrypt 4 0 R>>
%%EOF`;
    expect(await reasonOf(new File([encrypted], 'locked.pdf'))).toBe('locked');
  });
  it('turns away a file bigger than the whole allowance without loading it', async () => {
    const huge = { name: 'huge.pdf', size: MAX_TOTAL_BYTES + 1, slice: () => new Blob(['%PDF-1.7']), arrayBuffer: () => Promise.reject(new Error('must not be read')) };
    expect(await reasonOf(huge as unknown as File)).toBe('tooLarge');
  });
  it('reports a file the browser cannot hand over', async () => {
    const gone = { name: 'gone.pdf', size: 10, slice: () => ({ arrayBuffer: () => Promise.reject(new Error('NotFound')) }) };
    expect(await reasonOf(gone as unknown as File)).toBe('unreadable');
  });
  it('finds the header only where the PDF format allows it', () => {
    const at = (offset: number) => hasPdfHeader(new TextEncoder().encode(`${' '.repeat(offset)}%PDF-1.7`));
    expect(at(0)).toBe(true);
    expect(at(1024)).toBe(true);
    expect(at(1025)).toBe(false);
  });
});

describe('duplicate detection', () => {
  it('gives identical content the same fingerprint whatever the name', async () => {
    const a = await readPdf(packFile('experience_cert.pdf'));
    const b = await readPdf(packFile('experience_cert (1).pdf'));
    const c = await readPdf(packFile('trade_license_2025.pdf'));
    const d = await readPdf(packFile('trade_license_2026.pdf'));
    if (!a.ok || !b.ok || !c.ok || !d.ok) throw new Error('sample files should load');
    expect(a.file.hash).toBe(b.file.hash);
    expect(c.file.hash).not.toBe(d.file.hash);
  });
  it('has a script fallback that matches real SHA-256', async () => {
    for (const text of ['', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)]) {
      const bytes = new TextEncoder().encode(text);
      const expected = createHash('sha256').update(bytes).digest('hex');
      expect(sha256Fallback(bytes)).toBe(expected);
      expect(await contentHash(bytes.buffer as ArrayBuffer)).toBe(expected);
    }
  });
});

describe('project state', () => {
  const requirement = (id: string): Requirement => ({ id, order: 1, title_en: id, title_bn: id, mandatory: true, has_expiry: false });
  const file = (id: string, hash = id, size = 10): UploadedFile => ({ id, name: `${id}.pdf`, size, pages: 1, hash, bytes: new Uint8Array() });
  const loaded = (files: UploadedFile[]): State => ({
    ...initialState,
    tender: { tender_id: 'T', title: '', procuring_entity: '', bidder: '', submission_deadline: '2026-10-20' },
    requirements: [requirement('R1'), requirement('R2'), requirement('R3')],
    files,
  });
  const match = (state: State, requirementId: string, fileId: string) => reducer(state, { type: 'match', requirementId, fileId });

  it('keeps one file per document and one document per file', () => {
    let state = loaded([file('a'), file('b')]);
    state = match(state, 'R1', 'a');
    state = match(state, 'R2', 'a'); // moving the file frees R1
    expect(state.matches).toEqual({ R2: 'a' });
    state = match(state, 'R2', 'b'); // replacing frees the old file
    expect(state.matches).toEqual({ R2: 'b' });
  });
  it('refuses identical files on two different documents', () => {
    let state = loaded([file('a', 'same'), file('a2', 'same'), file('c')]);
    state = match(state, 'R1', 'a');
    expect(findDuplicateConflict(state, 'a2', 'R2')?.requirement.id).toBe('R1');
    expect(match(state, 'R2', 'a2').matches).toEqual({ R1: 'a' });
    expect(match(state, 'R1', 'a2').matches).toEqual({ R1: 'a2' }); // swapping within the same document is fine
    expect(findDuplicateConflict(state, 'c', 'R2')).toBeNull();
  });
  it('assigns a whole set at once, whatever was matched before', () => {
    let state = loaded([file('a', 'same'), file('a2', 'same'), file('c')]);
    state = match(state, 'R2', 'a2'); // the twin sits on another document
    state = match(state, 'R3', 'c');
    state = reducer(state, { type: 'assign', pairs: [{ requirementId: 'R1', fileId: 'a', expiry: '2027-01-01' }, { requirementId: 'R2', fileId: 'c' }] });
    expect(state.matches).toEqual({ R1: 'a', R2: 'c' });
    expect(state.expiry).toEqual({ a: '2027-01-01' });
  });
  it('ignores matches to files or documents that do not exist', () => {
    const state = loaded([file('a')]);
    expect(match(state, 'R1', 'ghost')).toBe(state);
    expect(match(state, 'nope', 'a')).toBe(state);
  });
  it('undoes a match and forgets a removed file everywhere', () => {
    let state = match(loaded([file('a'), file('b')]), 'R1', 'a');
    state = reducer(state, { type: 'expiry', fileId: 'a', date: '2027-01-01' });
    expect(reducer(state, { type: 'unmatch', requirementId: 'R1' }).matches).toEqual({});
    state = reducer(state, { type: 'removeFile', fileId: 'a' });
    expect(state.files.map((f) => f.id)).toEqual(['b']);
    expect(state.matches).toEqual({});
    expect(state.expiry).toEqual({});
  });
  it('enforces the 30-file and 50 MB limits even when uploads overlap', () => {
    let state = loaded(Array.from({ length: MAX_FILES - 1 }, (_, i) => file(`f${i}`)));
    state = reducer(state, { type: 'pending', items: [{ id: 'p1', name: 'x' }, { id: 'p2', name: 'y' }, { id: 'p3', name: 'z' }] });
    state = reducer(state, { type: 'settled', pendingId: 'p1', file: file('x'), rejection: null });
    state = reducer(state, { type: 'settled', pendingId: 'p2', file: file('y'), rejection: null });
    expect(state.files).toHaveLength(MAX_FILES);
    expect(state.rejections.map((r) => r.reason)).toEqual(['tooMany']);

    let roomy = loaded([file('big', 'big', MAX_TOTAL_BYTES - 5)]);
    roomy = reducer(roomy, { type: 'pending', items: [{ id: 'p', name: 'more' }, { id: 'q', name: 'fits' }] });
    roomy = reducer(roomy, { type: 'settled', pendingId: 'p', file: file('more', 'more', 6), rejection: null });
    roomy = reducer(roomy, { type: 'settled', pendingId: 'q', file: file('fits', 'fits', 5), rejection: null });
    expect(roomy.rejections.map((r) => r.reason)).toEqual(['tooLarge']);
    expect(roomy.files.map((f) => f.id)).toEqual(['big', 'fits']);
  });
  it('drops files that finish reading after a reset', () => {
    let state = reducer(loaded([]), { type: 'pending', items: [{ id: 'p', name: 'x' }] });
    state = reducer(state, { type: 'reset' });
    expect(reducer(state, { type: 'settled', pendingId: 'p', file: file('x'), rejection: null })).toBe(state);
  });
});

describe('dropped folders', () => {
  const fileEntry = (name: string): DroppedEntry => ({ isFile: true, isDirectory: false, name, file: (resolve) => resolve(new File(['x'], name)) });
  const folder = (name: string, children: DroppedEntry[]): DroppedEntry => ({
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let batches = [children.slice(0, 2), children.slice(2), []];
      return { readEntries: (resolve) => resolve(batches.shift() ?? []) };
    },
  });

  it('walks nested folders, in name order, skipping system clutter', async () => {
    const pack = folder('sample-pack', [
      fileEntry('requirements.json'),
      fileEntry('README.txt'),
      fileEntry('.DS_Store'),
      folder('documents', [fileEntry('b.pdf'), fileEntry('a.pdf'), fileEntry('Thumbs.db'), fileEntry('~$draft.pdf')]),
    ]);
    const names = (await filesFromEntries([pack, null])).map((f) => f.name);
    expect(names).toEqual(['a.pdf', 'b.pdf', 'README.txt', 'requirements.json']);
  });
  it('keeps going when one entry cannot be read', async () => {
    const broken: DroppedEntry = { isFile: true, isDirectory: false, name: 'x.pdf', file: (_, reject) => reject(new Error('gone')) };
    const names = (await filesFromEntries([folder('f', [broken, fileEntry('ok.pdf')])])).map((f) => f.name);
    expect(names).toEqual(['ok.pdf']);
  });
});
