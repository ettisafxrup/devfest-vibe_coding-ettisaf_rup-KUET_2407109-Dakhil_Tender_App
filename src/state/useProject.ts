import { useCallback, useMemo, useReducer, useRef } from 'react';
import { MAX_FILES, MAX_TOTAL_BYTES, readPdf } from '../lib/files';
import { buildRows } from '../lib/status';
import type { PendingFile, Rejection, Requirement, Tender, UploadedFile } from '../types';

export interface DuplicateNotice {
  file: UploadedFile;
  other: UploadedFile;
  requirement: Requirement;
}

interface State {
  tender: Tender | null;
  requirements: Requirement[];
  files: UploadedFile[];
  pending: PendingFile[];
  rejections: Rejection[];
  /** requirement id -> file id (one file per document, one document per file) */
  matches: Record<string, string>;
  /** file id -> YYYY-MM-DD; the date belongs to the file, so it survives re-matching */
  expiry: Record<string, string>;
  notice: DuplicateNotice | null;
}

type Action =
  | { type: 'load'; tender: Tender; requirements: Requirement[] }
  | { type: 'pending'; items: PendingFile[] }
  | { type: 'settled'; pendingId: string; file: UploadedFile | null; rejection: Rejection | null }
  | { type: 'removeFile'; fileId: string }
  | { type: 'dismissRejection'; id: string }
  | { type: 'match'; requirementId: string; fileId: string }
  | { type: 'unmatch'; requirementId: string }
  | { type: 'expiry'; fileId: string; date: string }
  | { type: 'notice'; notice: DuplicateNotice | null }
  | { type: 'reset' };

const initial: State = {
  tender: null,
  requirements: [],
  files: [],
  pending: [],
  rejections: [],
  matches: {},
  expiry: {},
  notice: null,
};

const without = <T,>(record: Record<string, T>, drop: (key: string, value: T) => boolean) =>
  Object.fromEntries(Object.entries(record).filter(([key, value]) => !drop(key, value)));

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { ...initial, tender: action.tender, requirements: action.requirements };
    case 'pending':
      return { ...state, pending: [...state.pending, ...action.items] };
    case 'settled': {
      // A reset while files were still being read drops the stragglers.
      if (!state.pending.some((p) => p.id === action.pendingId)) return state;
      return {
        ...state,
        pending: state.pending.filter((p) => p.id !== action.pendingId),
        files: action.file ? [...state.files, action.file] : state.files,
        rejections: action.rejection ? [...state.rejections, action.rejection] : state.rejections,
      };
    }
    case 'removeFile':
      return {
        ...state,
        files: state.files.filter((f) => f.id !== action.fileId),
        matches: without(state.matches, (_, fileId) => fileId === action.fileId),
        expiry: without(state.expiry, (fileId) => fileId === action.fileId),
        notice: null,
      };
    case 'dismissRejection':
      return { ...state, rejections: state.rejections.filter((r) => r.id !== action.id) };
    case 'match':
      return {
        ...state,
        matches: {
          ...without(state.matches, (_, fileId) => fileId === action.fileId),
          [action.requirementId]: action.fileId,
        },
        notice: null,
      };
    case 'unmatch':
      return {
        ...state,
        matches: without(state.matches, (requirementId) => requirementId === action.requirementId),
        notice: null,
      };
    case 'expiry':
      return { ...state, expiry: { ...state.expiry, [action.fileId]: action.date } };
    case 'notice':
      return { ...state, notice: action.notice };
    case 'reset':
      return initial;
  }
}

/** If an identical copy of this file is already used for a different document, says where. */
function findDuplicateConflict(state: State, fileId: string, requirementId: string): DuplicateNotice | null {
  const file = state.files.find((f) => f.id === fileId);
  if (!file) return null;
  for (const requirement of state.requirements) {
    if (requirement.id === requirementId) continue;
    const other = state.files.find((f) => f.id === state.matches[requirement.id]);
    if (other && other.id !== file.id && other.hash === file.hash) return { file, other, requirement };
  }
  return null;
}

export function useProject() {
  const [state, dispatch] = useReducer(reducer, initial);
  const latest = useRef(state);
  latest.current = state;

  const derived = useMemo(() => {
    const rows = buildRows(
      state.requirements,
      state.files,
      state.matches,
      state.expiry,
      state.tender?.submission_deadline ?? '',
    );
    /** file id -> the document it is used for */
    const placement = new Map<string, Requirement>();
    for (const row of rows) if (row.file) placement.set(row.file.id, row.requirement);
    /** file id -> another uploaded file with identical content */
    const duplicateOf = new Map<string, UploadedFile>();
    for (const file of state.files) {
      const twin = state.files.find((f) => f.id !== file.id && f.hash === file.hash);
      if (twin) duplicateOf.set(file.id, twin);
    }
    return { rows, placement, duplicateOf };
  }, [state.requirements, state.files, state.matches, state.expiry, state.tender]);

  const loadTender = useCallback((tender: Tender, requirements: Requirement[]) => {
    dispatch({ type: 'load', tender, requirements });
  }, []);

  const addFiles = useCallback(async (incoming: File[]) => {
    if (incoming.length === 0) return;
    const pending = incoming.map((file) => ({ id: crypto.randomUUID(), name: file.name }));
    dispatch({ type: 'pending', items: pending });

    let count = latest.current.files.length;
    let bytes = latest.current.files.reduce((sum, f) => sum + f.size, 0);
    for (let i = 0; i < incoming.length; i++) {
      const source = incoming[i];
      const { id } = pending[i];
      const result = await readPdf(source);
      let file: UploadedFile | null = null;
      let rejection: Rejection | null = null;
      if (!result.ok) rejection = { id, name: source.name, reason: result.reason };
      else if (count >= MAX_FILES) rejection = { id, name: source.name, reason: 'tooMany' };
      else if (bytes + source.size > MAX_TOTAL_BYTES) rejection = { id, name: source.name, reason: 'tooLarge' };
      else {
        file = result.file;
        count += 1;
        bytes += source.size;
      }
      dispatch({ type: 'settled', pendingId: id, file, rejection });
    }
  }, []);

  const duplicateConflict = useCallback(
    (fileId: string, requirementId: string) => findDuplicateConflict(state, fileId, requirementId),
    [state],
  );

  const match = useCallback((requirementId: string, fileId: string) => {
    const conflict = findDuplicateConflict(latest.current, fileId, requirementId);
    if (conflict) dispatch({ type: 'notice', notice: conflict });
    else dispatch({ type: 'match', requirementId, fileId });
  }, []);

  const unmatch = useCallback((requirementId: string) => dispatch({ type: 'unmatch', requirementId }), []);
  const removeFile = useCallback((fileId: string) => dispatch({ type: 'removeFile', fileId }), []);
  const setExpiry = useCallback((fileId: string, date: string) => dispatch({ type: 'expiry', fileId, date }), []);
  const dismissRejection = useCallback((id: string) => dispatch({ type: 'dismissRejection', id }), []);
  const dismissNotice = useCallback(() => dispatch({ type: 'notice', notice: null }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    ...state,
    ...derived,
    loadTender,
    addFiles,
    duplicateConflict,
    match,
    unmatch,
    removeFile,
    setExpiry,
    dismissRejection,
    dismissNotice,
    reset,
  };
}

export type Project = ReturnType<typeof useProject>;
