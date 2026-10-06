import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RequirementsError, isoDate, parseRequirements } from '../src/lib/requirements';
import { routeOfPath } from '../src/lib/router';
import { buildRows, isBlocking, statusOf } from '../src/lib/status';
import type { Requirement, UploadedFile } from '../src/types';
import { PACK } from './helpers';

const requirement = (over: Partial<Requirement> = {}): Requirement => ({
  id: 'R1',
  order: 1,
  title_en: 'Doc',
  title_bn: 'Doc',
  mandatory: true,
  has_expiry: false,
  ...over,
});
const file = (id: string, pages = 1, hash = id): UploadedFile => ({ id, name: `${id}.pdf`, size: 10, pages, hash, bytes: new Uint8Array() });
const DEADLINE = '2026-10-20';

describe('status rules (problem statement, section 5)', () => {
  it('Missing: required, no file, blocks', () => {
    expect(statusOf(requirement(), null, '', DEADLINE)).toBe('missing');
    expect(isBlocking('missing')).toBe(true);
  });
  it('Not provided: optional, no file, does not block', () => {
    expect(statusOf(requirement({ mandatory: false }), null, '', DEADLINE)).toBe('notProvided');
    expect(isBlocking('notProvided')).toBe(false);
  });
  it('Expiry date needed: matched, has_expiry, no date, blocks (optional too)', () => {
    expect(statusOf(requirement({ has_expiry: true }), file('a'), '', DEADLINE)).toBe('expiryNeeded');
    expect(statusOf(requirement({ has_expiry: true, mandatory: false }), file('a'), '', DEADLINE)).toBe('expiryNeeded');
    expect(isBlocking('expiryNeeded')).toBe(true);
  });
  it('Expired: date before the deadline, blocks', () => {
    expect(statusOf(requirement({ has_expiry: true }), file('a'), '2026-10-19', DEADLINE)).toBe('expired');
    expect(statusOf(requirement({ has_expiry: true }), file('a'), '2025-12-31', DEADLINE)).toBe('expired');
    expect(isBlocking('expired')).toBe(true);
  });
  it('OK: expiring on the deadline day itself is still valid', () => {
    expect(statusOf(requirement({ has_expiry: true }), file('a'), '2026-10-20', DEADLINE)).toBe('ok');
    expect(statusOf(requirement({ has_expiry: true }), file('a'), '2026-10-21', DEADLINE)).toBe('ok');
    expect(statusOf(requirement(), file('a'), '', DEADLINE)).toBe('ok');
    expect(isBlocking('ok')).toBe(false);
  });
  it('ignores a date on a document that has no expiry', () => {
    const rows = buildRows([requirement()], [file('a')], { R1: 'a' }, { a: '2000-01-01' }, DEADLINE);
    expect(rows[0].status).toBe('ok');
    expect(rows[0].expiry).toBe('');
  });
  it('numbers pages from 2 (after the cover) and skips unmatched documents', () => {
    const requirements = [requirement({ id: 'A' }), requirement({ id: 'B', mandatory: false }), requirement({ id: 'C' })];
    const rows = buildRows(requirements, [file('x', 3), file('y', 2)], { A: 'x', C: 'y' }, {}, DEADLINE);
    expect(rows.map((r) => [r.startPage, r.endPage])).toEqual([[2, 4], [null, null], [5, 6]]);
  });
  it('treats a match to a file that no longer exists as no file', () => {
    const rows = buildRows([requirement()], [], { R1: 'gone' }, {}, DEADLINE);
    expect(rows[0].status).toBe('missing');
  });
});

describe('requirements.json', () => {
  const valid = (over: object = {}, list?: object[]) =>
    JSON.stringify({
      tender: { tender_id: 'T-1', title: 'Title', procuring_entity: 'PE', bidder: 'B', submission_deadline: DEADLINE, ...over },
      requirements: list ?? [{ id: 'R01', order: 1, title_en: 'One', title_bn: 'এক', mandatory: true, has_expiry: true }],
    });
  const code = (raw: string) => {
    try {
      parseRequirements(raw);
      return 'ok';
    } catch (error) {
      return error instanceof RequirementsError ? error.code : 'crash';
    }
  };

  it('reads the official sample and keeps it in order', () => {
    const { tender, requirements } = parseRequirements(readFileSync(new URL('requirements.json', PACK), 'utf8'));
    expect(tender.tender_id).toBe('T-2026-0417');
    expect(requirements.map((r) => r.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(requirements.filter((r) => r.mandatory)).toHaveLength(8);
    expect(requirements.filter((r) => r.has_expiry).map((r) => r.id)).toEqual(['R01', 'R04', 'R07']);
  });
  it('sorts by order, keeping file order for ties', () => {
    const list = [
      { id: 'c', order: 3, title_en: 'C' },
      { id: 'a', order: 1, title_en: 'A' },
      { id: 'b1', order: 2, title_en: 'B1' },
      { id: 'b2', order: 2, title_en: 'B2' },
    ];
    expect(parseRequirements(valid({}, list)).requirements.map((r) => r.id)).toEqual(['a', 'b1', 'b2', 'c']);
  });
  it('accepts a byte-order mark and numeric strings', () => {
    const list = [{ id: 'a', order: '2', title_en: 'A', mandatory: 'true', has_expiry: 'false' }];
    const parsed = parseRequirements(`﻿${valid({}, list)}`);
    expect(parsed.requirements[0]).toMatchObject({ order: 2, mandatory: true, has_expiry: false });
  });
  it('fills a missing title from the other language', () => {
    const { requirements } = parseRequirements(valid({}, [{ id: 'a', order: 1, title_bn: 'শুধু বাংলা' }, { id: 'b', order: 2, title_en: 'English only' }]));
    expect(requirements[0].title_en).toBe('শুধু বাংলা');
    expect(requirements[1].title_bn).toBe('English only');
  });
  it('gives repeated or missing ids unique stand-ins instead of failing', () => {
    const list = [{ id: 'R1', order: 1, title_en: 'A' }, { id: 'R1', order: 2, title_en: 'B' }, { order: 3, title_en: 'C' }];
    const ids = parseRequirements(valid({}, list)).requirements.map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
  });
  it('rejects what it cannot use, with the right reason', () => {
    expect(code('{ broken')).toBe('json');
    expect(code('')).toBe('json');
    expect(code('null')).toBe('shape');
    expect(code('[]')).toBe('shape');
    expect(code('{"tender":{},"requirements":[]}')).toBe('shape');
    expect(code(valid({ tender_id: '' }))).toBe('shape');
    expect(code(valid({ submission_deadline: '20/10/2026' }))).toBe('shape');
    expect(code(valid({ submission_deadline: '2026-02-30' }))).toBe('shape');
    expect(code(valid({}, []))).toBe('shape');
    expect(code(valid({}, [{ id: 'a', title_en: 'No order' }]))).toBe('shape');
    expect(code(valid({}, [{ id: 'a', order: null, title_en: 'Null order' }]))).toBe('shape');
    expect(code(valid({}, [{ id: 'a', order: 1 }]))).toBe('shape');
    expect(code(valid({}, [null]))).toBe('shape');
  });
  it('validates dates as real calendar days', () => {
    expect(isoDate('2026-10-20')).toBe('2026-10-20');
    expect(isoDate('2024-02-29')).toBe('2024-02-29');
    expect(isoDate('2026-02-29')).toBe('');
    expect(isoDate('2026-13-01')).toBe('');
    expect(isoDate('2026-10-20T00:00:00Z')).toBe('2026-10-20');
    expect(isoDate('')).toBe('');
    expect(isoDate(20261020)).toBe('');
  });
});

describe('routes', () => {
  it('maps clean paths to pages', () => {
    expect(routeOfPath('/', '')).toBe('home');
    expect(routeOfPath('/index.html', '')).toBe('home');
    expect(routeOfPath('/sample', '')).toBe('sample');
    expect(routeOfPath('/sample/', '')).toBe('sample');
    expect(routeOfPath('/tender', '')).toBe('tender');
    expect(routeOfPath('/nope', '')).toBeNull();
    expect(routeOfPath('/app/sample', '/app')).toBe('sample');
  });
});
