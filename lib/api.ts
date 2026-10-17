import Constants from 'expo-constants';
import { fetchTelebirrReceipt, type TelebirrReceipt, type FetchResult } from './telebirr';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'https://tbchecker-appi.vercel.app';

export type { TelebirrReceipt };

export type VerifyResponse = FetchResult;

export interface OcrResult {
  success: boolean;
  txid?: string;
  type?: string;
  rawText?: string;
  error?: string;
}

export async function verifyTelebirr(txid: string): Promise<VerifyResponse> {
  return fetchTelebirrReceipt(txid);
}

export async function ocrImage(base64: string): Promise<OcrResult> {
  try {
    const res = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: 'network_error' };
  }
}

export function isValidTxid(txid: string): boolean {
  return /^[A-Z0-9]{10}$/.test(txid.trim().toUpperCase());
}

export function normalizeTxid(input: string): string {
  return input.trim().toUpperCase();
}
