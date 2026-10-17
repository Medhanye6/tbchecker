import type { OcrResult } from './api';

export interface OcrDebugRecord extends OcrResult {
  at: number;
  imageUri?: string;
}

let last: OcrDebugRecord | null = null;

function sanitizeError(error?: string): string | undefined {
  if (!error) return error;
  return error.replace(/mstrl_[A-Za-z0-9_]+/g, 'mstrl_***');
}

export function setLastOcrDebug(record: OcrDebugRecord): void {
  last = { ...record, error: sanitizeError(record.error) };
}

export function getLastOcrDebug(): OcrDebugRecord | null {
  return last;
}
