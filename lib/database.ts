import * as SQLite from 'expo-sqlite';
import { TelebirrReceipt } from './api';

export interface HistoryItem {
  id: number;
  txid: string;
  status: 'verified' | 'not_found' | 'error';
  payer_name: string | null;
  payer_account: string | null;
  receiver_name: string | null;
  receiver_account: string | null;
  amount: string | null;
  service_fee: string | null;
  vat: string | null;
  total_paid: string | null;
  transaction_status: string | null;
  date: string | null;
  bank: string | null;
  note: string | null;
  receipt_no: string | null;
  raw_json: string | null;
  created_at: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('tbchecker.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txid TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'verified',
      payer_name TEXT,
      payer_account TEXT,
      receiver_name TEXT,
      receiver_account TEXT,
      amount TEXT,
      service_fee TEXT,
      vat TEXT,
      total_paid TEXT,
      transaction_status TEXT,
      date TEXT,
      bank TEXT,
      note TEXT,
      receipt_no TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_history_txid ON history(txid);
    CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
  `);
  return db;
}

export async function saveToHistory(
  txid: string,
  status: 'verified' | 'not_found' | 'error',
  receipt?: TelebirrReceipt | null
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO history (
      txid, status, payer_name, payer_account, receiver_name, receiver_account,
      amount, service_fee, vat, total_paid, transaction_status, date, bank, note, receipt_no, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      txid,
      status,
      receipt?.payerName ?? null,
      receipt?.payerTelebirrNo ?? null,
      receipt?.creditedPartyName ?? null,
      receipt?.creditedPartyAccountNo ?? null,
      receipt?.settledAmount ?? null,
      receipt?.serviceFee ?? null,
      receipt?.serviceFeeVAT ?? null,
      receipt?.totalPaidAmount ?? null,
      receipt?.transactionStatus ?? null,
      receipt?.paymentDate ?? null,
      receipt?.bankName ?? null,
      receipt?.customerNote ?? null,
      receipt?.receiptNo ?? null,
      receipt ? JSON.stringify(receipt) : null,
    ]
  );
  return result.lastInsertRowId;
}

export async function getHistory(limit = 100): Promise<HistoryItem[]> {
  const database = await getDb();
  return database.getAllAsync<HistoryItem>(
    'SELECT * FROM history ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function searchHistory(query: string): Promise<HistoryItem[]> {
  const database = await getDb();
  return database.getAllAsync<HistoryItem>(
    `SELECT * FROM history
     WHERE txid LIKE ? OR payer_name LIKE ? OR receiver_name LIKE ? OR amount LIKE ?
     ORDER BY created_at DESC LIMIT 50`,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
  );
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM history WHERE id = ?', [id]);
}

export async function clearHistory(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM history');
}

export async function getHistoryCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM history');
  return row?.count ?? 0;
}
