export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  /** YYYY-MM-DD */
  submission_deadline: string;
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pages: number;
  /** SHA-256 of the file bytes; equal hashes mean identical content. */
  hash: string;
  bytes: Uint8Array;
}

export type RejectReason = 'notPdf' | 'damaged' | 'locked' | 'tooMany' | 'tooLarge';

export interface Rejection {
  id: string;
  name: string;
  reason: RejectReason;
}

export interface PendingFile {
  id: string;
  name: string;
}

export type Status = 'missing' | 'expiryNeeded' | 'expired' | 'notProvided' | 'ok';

/** One line of the checklist: a requirement plus whatever is matched to it. */
export interface Row {
  requirement: Requirement;
  file: UploadedFile | null;
  /** YYYY-MM-DD, or '' when not entered. */
  expiry: string;
  status: Status;
  /** Page range in the final package (cover is page 1); null when not included. */
  startPage: number | null;
  endPage: number | null;
}

export type Lang = 'en' | 'bn';
