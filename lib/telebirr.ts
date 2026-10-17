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

export interface FetchResult {
  success: boolean;
  data?: TelebirrReceipt;
  error?: string;
}

const RECEIPT_BASE = 'https://transactioninfo.ethiotelecom.et/receipt/';

function stripTags(s: string): string {
  return String(s).replace(/<[^>]*>/g, '');
}

function extractCells(html: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    cells.push(stripTags(m[1]).replace(/\s+/g, ' ').trim());
  }
  return cells;
}

function extractSettledAmountRegex(html: string): string | null {
  const patterns = [
    /የተከፈለው\s+መጠን\/Settled\s+Amount.*?<\/td>\s*<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /<tr[^>]*>.*?የተከፈለው\s+መጠን\/Settled\s+Amount.*?<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /Settled\s+Amount.*?([\d,]+(?:\.\d+)?\s+Birr)/is,
    /የክፍያ\s+ዝርዝር\/Transaction\s+details.*?<tr[^>]*>.*?<td[^>]*>\s*[^<]*<\/td>\s*<td[^>]*>\s*[^<]*<\/td>\s*<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractServiceFeeRegex(html: string): string | null {
  const patterns = [
    /የአገልግሎት\s+ክፍያ\/Service\s+fee(?!\s+ተ\.እ\.ታ).*?<\/td>\s*<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /<tr[^>]*>.*?የአገልግሎት\s+ክፍያ\/Service\s+fee(?!\s+ተ\.እ\.ታ).*?<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /Service\s+fee(?!\s+VAT).*?([\d,]+(?:\.\d+)?\s+Birr)/is,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractReceiptNoRegex(html: string): string | null {
  const m = html.match(
    /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i
  );
  return m ? m[1].trim() : null;
}

function extractDateRegex(html: string): string | null {
  const m = html.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
  return m ? m[1].trim() : null;
}

function extractWithRegex(html: string, labelPattern: string): string | null {
  const escaped = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<td[^>]*>\\s*${escaped}\\s*(?:<\\/td>\\s*)?<td[^>]*>\\s*([^<]+)`,
    'i'
  );
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : null;
}

function extractNextCellText(html: string, labels: string[]): string {
  const cells = extractCells(html);
  for (const label of labels) {
    const idx = cells.findIndex((c) => c.includes(label));
    if (idx !== -1 && idx + 1 < cells.length) {
      const value = cells[idx + 1];
      if (value) return value;
    }
  }
  return '';
}

function extractReceiptNoFallback(html: string): string {
  const re = /<td[^>]*class="[^"]*receipttableTd2[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
  const vals: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    vals.push(stripTags(m[1]).replace(/\s+/g, ' ').trim());
  }
  return vals.length > 1 ? vals[1] : vals[0] || '';
}

function extractPaymentDateFallback(html: string): string {
  const cells = extractCells(html);
  const found = cells.find((c) => c.includes('-202'));
  return found || '';
}

export function scrapeTelebirrReceipt(html: string): TelebirrReceipt {
  const getSettledAmount = () => {
    const regexAmount = extractSettledAmountRegex(html);
    if (regexAmount) return regexAmount;
    return extractNextCellText(html, ['የተከፈለው መጠን', 'Settled Amount']);
  };

  const getServiceFee = () => {
    const regexFee = extractServiceFeeRegex(html);
    if (regexFee) return regexFee;
    return extractNextCellText(html, ['የአገልግሎት ክፍያ', 'Service fee']);
  };

  const getReceiptNo = () => {
    const regexReceipt = extractReceiptNoRegex(html);
    if (regexReceipt) return regexReceipt;
    return extractReceiptNoFallback(html);
  };

  const getPaymentDate = () => {
    const regexDate = extractDateRegex(html);
    if (regexDate) return regexDate;
    return extractPaymentDateFallback(html);
  };

  let creditedPartyName =
    extractWithRegex(html, 'የገንዘብ ተቀባይ ስም/Credited Party name') ||
    extractNextCellText(html, ['የገንዘብ ተቀባይ ስም/Credited Party name', 'Credited Party name']);
  let creditedPartyAccountNo =
    extractWithRegex(html, 'የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no') ||
    extractNextCellText(html, [
      'የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no',
      'Credited party account no',
    ]);
  let bankName = '';

  const bankAccountNumberRaw =
    extractWithRegex(html, 'የባንክ አካውንት ቁጥር/Bank account number') ||
    extractNextCellText(html, ['የባንክ አካውንት ቁጥር/Bank account number', 'Bank account number']);

  if (bankAccountNumberRaw) {
    bankName = creditedPartyName;
    const match = bankAccountNumberRaw.match(/(\d+)\s+(.*)/);
    if (match) {
      creditedPartyAccountNo = match[1].trim();
      creditedPartyName = match[2].trim();
    }
  }

  return {
    payerName:
      extractWithRegex(html, 'የከፋይ ስም/Payer Name') ||
      extractNextCellText(html, ['የከፋይ ስም/Payer Name', 'Payer Name']),
    payerTelebirrNo:
      extractWithRegex(html, 'የከፋይ ቴሌብር ቁ./Payer telebirr no.') ||
      extractNextCellText(html, [
        'የከፋይ ቴሌብር ቁ./Payer telebirr no.',
        'Payer telebirr no.',
        'Payer Telebirr No.',
      ]),
    creditedPartyName,
    creditedPartyAccountNo,
    transactionStatus:
      extractWithRegex(html, 'የክፍያው ሁኔታ/transaction status') ||
      extractNextCellText(html, [
        'የክፍያው ሁኔታ/transaction status',
        'Transaction status',
        'transaction status',
      ]),
    receiptNo: getReceiptNo(),
    paymentDate: getPaymentDate(),
    settledAmount: getSettledAmount(),
    serviceFee: getServiceFee(),
    serviceFeeVAT:
      extractWithRegex(html, 'የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT') ||
      extractNextCellText(html, ['የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT', 'Service fee VAT']),
    totalPaidAmount:
      extractWithRegex(html, 'ጠቅላላ የተከፈለ/Total Paid Amount') ||
      extractNextCellText(html, ['ጠቅላላ የተከፈለ/Total Paid Amount', 'Total Paid Amount']),
    bankName,
    customerNote:
      extractWithRegex(html, 'የደንበኛ መልዕክት/Customer Note') ||
      extractNextCellText(html, ['የደንበኛ መልዕክት/Customer Note', 'Customer Note']),
  };
}

export function isValidReceipt(r: TelebirrReceipt): boolean {
  return !!(r.receiptNo && r.payerName && r.transactionStatus);
}

const RECEIPT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'am-ET,am;q=0.9,en-US;q=0.8,en;q=0.7',
};

export async function fetchTelebirrReceipt(txid: string): Promise<FetchResult> {
  const reference = String(txid || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(reference)) {
    return {
      success: false,
      error: 'Invalid reference. Must be 10 uppercase alphanumeric characters.',
    };
  }

  const url = `${RECEIPT_BASE}${encodeURIComponent(reference)}`;
  const attempts = 3;
  let lastError = 'network_error';

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: RECEIPT_HEADERS,
      });
      clearTimeout(timer);

      if (!res.ok) {
        lastError = `Telebirr returned HTTP ${res.status}`;
        continue;
      }

      const html = await res.text();
      if (!html || html.length < 100) {
        lastError = 'Empty or invalid response from Telebirr.';
        continue;
      }

      const receipt = scrapeTelebirrReceipt(html);
      if (!isValidReceipt(receipt)) {
        return { success: false, error: 'Transaction not found.' };
      }
      return { success: true, data: receipt };
    } catch (e) {
      clearTimeout(timer);
      lastError =
        e && (e as Error).name === 'AbortError'
          ? 'Telebirr timed out. Check your connection and try again.'
          : ((e as Error)?.message || 'network_error');
    }
  }

  return { success: false, error: lastError };
}
