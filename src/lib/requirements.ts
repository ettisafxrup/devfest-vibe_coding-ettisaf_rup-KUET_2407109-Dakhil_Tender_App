import type { Requirement, Tender } from '../types';

export type RequirementsErrorCode = 'json' | 'shape';

export class RequirementsError extends Error {
  constructor(public code: RequirementsErrorCode) {
    super(code);
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';

/** Parses and validates requirements.json; requirements come back sorted by `order`. */
export function parseRequirements(raw: string): { tender: Tender; requirements: Requirement[] } {
  let data: any;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ''));
  } catch {
    throw new RequirementsError('json');
  }

  const t = data?.tender;
  const list = data?.requirements;
  if (!t || typeof t !== 'object' || !Array.isArray(list) || list.length === 0) {
    throw new RequirementsError('shape');
  }

  const tender: Tender = {
    tender_id: text(t.tender_id),
    title: text(t.title),
    procuring_entity: text(t.procuring_entity),
    bidder: text(t.bidder),
    submission_deadline: text(t.submission_deadline),
  };
  if (!tender.tender_id || !ISO_DATE.test(tender.submission_deadline)) {
    throw new RequirementsError('shape');
  }

  const seen = new Set<string>();
  const requirements = list.map((item: any, index: number): Requirement => {
    const order = Number(item?.order);
    const titleEn = text(item?.title_en);
    const titleBn = text(item?.title_bn);
    const id = text(item?.id) || `R${index + 1}`;
    if (!item || !Number.isFinite(order) || !(titleEn || titleBn) || seen.has(id)) {
      throw new RequirementsError('shape');
    }
    seen.add(id);
    return {
      id,
      order,
      title_en: titleEn || titleBn,
      title_bn: titleBn || titleEn,
      mandatory: item.mandatory === true,
      has_expiry: item.has_expiry === true,
    };
  });

  // Array.prototype.sort is stable, so equal orders keep their file order.
  requirements.sort((a, b) => a.order - b.order);
  return { tender, requirements };
}
