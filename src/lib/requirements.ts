import type { Requirement, Tender } from '../types';

export type RequirementsErrorCode = 'json' | 'shape';

export class RequirementsError extends Error {
  code: RequirementsErrorCode;
  constructor(code: RequirementsErrorCode) {
    super(code);
    this.code = code;
  }
}

const BYTE_ORDER_MARK = 0xfeff;

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';

const flag = (value: unknown): boolean =>
  value === true || value === 1 || (typeof value === 'string' && /^(true|yes|1)$/i.test(value.trim()));

/** A real calendar date in YYYY-MM-DD form (a trailing time part is tolerated), else ''. */
export function isoDate(value: unknown): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text(value));
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year); // Date.UTC treats years 0-99 as 1900-1999
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function orderOf(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

/** Parses and validates requirements.json; requirements come back sorted by `order`. */
export function parseRequirements(raw: string): { tender: Tender; requirements: Requirement[] } {
  let data: any;
  try {
    data = JSON.parse(raw.charCodeAt(0) === BYTE_ORDER_MARK ? raw.slice(1) : raw);
  } catch {
    throw new RequirementsError('json');
  }

  const t = data?.tender;
  const list = data?.requirements;
  if (!t || typeof t !== 'object' || Array.isArray(t) || !Array.isArray(list) || list.length === 0) {
    throw new RequirementsError('shape');
  }

  const tender: Tender = {
    tender_id: text(t.tender_id),
    title: text(t.title),
    procuring_entity: text(t.procuring_entity),
    bidder: text(t.bidder),
    submission_deadline: isoDate(t.submission_deadline),
  };
  if (!tender.tender_id || !tender.submission_deadline) throw new RequirementsError('shape');

  const used = new Set<string>();
  const requirements = list.map((item: any, index: number): Requirement => {
    const order = orderOf(item?.order);
    const titleEn = text(item?.title_en);
    const titleBn = text(item?.title_bn);
    if (!item || typeof item !== 'object' || !Number.isFinite(order) || !(titleEn || titleBn)) {
      throw new RequirementsError('shape');
    }
    // Ids key everything else, so a missing or repeated one gets a unique stand-in.
    let id = text(item.id) || `R${index + 1}`;
    for (let n = 2; used.has(id); n++) id = `${text(item.id) || `R${index + 1}`}-${n}`;
    used.add(id);
    return {
      id,
      order,
      title_en: titleEn || titleBn,
      title_bn: titleBn || titleEn,
      mandatory: flag(item.mandatory),
      has_expiry: flag(item.has_expiry),
    };
  });

  // Array.prototype.sort is stable, so equal orders keep their file order.
  requirements.sort((a, b) => a.order - b.order);
  return { tender, requirements };
}
