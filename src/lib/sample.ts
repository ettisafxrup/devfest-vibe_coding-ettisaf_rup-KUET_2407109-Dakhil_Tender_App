const BASE = `${import.meta.env.BASE_URL}sample/`;

// The PDFs of the official contest sample pack, problems included (a duplicate, an expired
// licence, a scan with a meaningless name). The pack's PNG logo is left out on purpose: the
// visitor did not add it, so they should not be greeted by an error about it.
const DOCUMENTS = [
  '01_financial_proposal.pdf',
  '02_technical_proposal.pdf',
  '03_tin_certificate.pdf',
  '04_vat_certificate.pdf',
  'bank_solvency.pdf',
  'experience_cert (1).pdf',
  'experience_cert.pdf',
  'scan_0042.pdf',
  'trade_license_2025.pdf',
  'trade_license_2026.pdf',
];

async function fetchFile(path: string, name: string): Promise<File> {
  const response = await fetch(BASE + path);
  if (!response.ok) throw new Error(`Sample file missing: ${name}`);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
}

export function loadSamplePack(): Promise<File[]> {
  return Promise.all([
    fetchFile('requirements.json', 'requirements.json'),
    ...DOCUMENTS.map((name) => fetchFile(`documents/${encodeURIComponent(name)}`, name)),
  ]);
}

/**
 * The answer key for the sample pack: the file that correctly satisfies each
 * required document, with the expiry date printed on it where one applies.
 * It deliberately picks the renewed trade licence, one copy of the duplicated
 * certificate, and the scan that is really the signed declaration.
 */
export const SAMPLE_ANSWERS: { requirementId: string; fileName: string; expiry?: string }[] = [
  { requirementId: 'R01', fileName: 'trade_license_2026.pdf', expiry: '2027-06-30' },
  { requirementId: 'R02', fileName: '03_tin_certificate.pdf' },
  { requirementId: 'R03', fileName: '04_vat_certificate.pdf' },
  { requirementId: 'R04', fileName: 'bank_solvency.pdf', expiry: '2026-12-31' },
  { requirementId: 'R05', fileName: 'experience_cert.pdf' },
  { requirementId: 'R08', fileName: '02_technical_proposal.pdf' },
  { requirementId: 'R09', fileName: '01_financial_proposal.pdf' },
  { requirementId: 'R10', fileName: 'scan_0042.pdf' },
];
