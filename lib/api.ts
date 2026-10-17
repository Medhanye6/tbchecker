import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'https://tb-checker-api.vercel.app';

export interface TelebirrReceipt {
  payerName: string;
  payerTelebirrNo: string;
  creditedPartyName: string;
  creditedPartyAccountNo: string;
  transactionStatus: string;
  receiptNo: string;
  paymentDate: string;
  settledAmount: string;
  serviceFee: string;
  serviceFeeVAT: string;
  totalPaidAmount: string;
  bankName: string;
  customerNote: string;
}

export interface VerifyResponse {
  success: boolean;
  data?: TelebirrReceipt;
  error?: string;
}

export interface OcrResult {
  success: boolean;
  txid?: string;
  type?: string;
  rawText?: string;
  error?: string;
}

export async function verifyTelebirr(txid: string): Promise<VerifyResponse> {
  try {
    const res = await fetch(`${API_URL}/api/verify-telebirr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: txid.trim().toUpperCase() }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: 'network_error' };
  }
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
