const BASE = `${import.meta.env.BASE_URL}sample/`;

// The official contest sample pack, problems included (a PNG, a duplicate, an expired licence).
const DOCUMENTS = [
  '01_financial_proposal.pdf',
  '02_technical_proposal.pdf',
  '03_tin_certificate.pdf',
  '04_vat_certificate.pdf',
  'bank_solvency.pdf',
  'company_logo.png',
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
