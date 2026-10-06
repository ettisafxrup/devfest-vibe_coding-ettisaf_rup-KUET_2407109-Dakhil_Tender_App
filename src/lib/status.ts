import type { Lang, Requirement, Row, Status, UploadedFile } from '../types';

/**
 * Section 5 of the problem statement. Dates are compared as YYYY-MM-DD strings
 * so there is no timezone drift; expiring on the deadline itself is still OK.
 */
export function statusOf(
  requirement: Requirement,
  file: UploadedFile | null,
  expiry: string,
  deadline: string,
): Status {
  if (!file) return requirement.mandatory ? 'missing' : 'notProvided';
  if (requirement.has_expiry) {
    if (!expiry) return 'expiryNeeded';
    if (expiry < deadline) return 'expired';
  }
  return 'ok';
}

export const isBlocking = (status: Status): boolean =>
  status === 'missing' || status === 'expiryNeeded' || status === 'expired';

/** Builds the checklist rows, including where each file lands in the package. */
export function buildRows(
  requirements: Requirement[],
  files: UploadedFile[],
  matches: Record<string, string>,
  expiryByFile: Record<string, string>,
  deadline: string,
): Row[] {
  const byId = new Map(files.map((f) => [f.id, f]));
  let nextPage = 2; // page 1 is the cover
  return requirements.map((requirement) => {
    const file = byId.get(matches[requirement.id] ?? '') ?? null;
    const expiry = file && requirement.has_expiry ? (expiryByFile[file.id] ?? '') : '';
    let startPage: number | null = null;
    let endPage: number | null = null;
    if (file) {
      startPage = nextPage;
      endPage = nextPage + file.pages - 1;
      nextPage = endPage + 1;
    }
    return {
      requirement,
      file,
      expiry,
      status: statusOf(requirement, file, expiry, deadline),
      startPage,
      endPage,
    };
  });
}

export const titleOf = (requirement: Requirement, lang: Lang): string =>
  lang === 'bn' ? requirement.title_bn : requirement.title_en;

export const rowDomId = (requirementId: string): string => `req-${requirementId}`;
