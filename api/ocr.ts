import type { VercelRequest, VercelResponse } from '@vercel/node';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'ministral-14b-2512';

const TXID_REGEX = /[A-Z0-9]{10}/;
const LABEL_TXID_REGEX =
  /(?:Transaction\s*Number|Transaction\s*No|TXID|Transaction\s*ID|Receipt\s*No|የግዕዛን\s*ቁጥር|ግዕዛን\s*ቁጥር)\s*[:\-]?\s*([A-Z0-9]{10})/i;

function extractTxid(text: string): string | null {
  const upper = text.toUpperCase();

  const labelMatch = upper.match(LABEL_TXID_REGEX);
  if (labelMatch) return labelMatch[1];

  const allMatches = upper.match(/[A-Z0-9]{10}/g);
  if (allMatches && allMatches.length > 0) {
    const hasDigits = allMatches.filter((m) => /\d/.test(m));
    if (hasDigits.length > 0) return hasDigits[0];
    return allMatches[0];
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'MISTRAL_API_KEY is not configured.',
    });
  }

  const imageBase64 = req.body?.image;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing "image" field. Provide a base64-encoded image string.',
    });
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: `data:image/jpeg;base64,${imageBase64}`,
              },
              {
                type: 'text',
                text: `You are an OCR assistant for Ethiopian Telebirr payment receipts. Extract data from this receipt image.

The receipt may be in Amharic (አማርኛ), Tigrinya (ትግርኛ), Afaan Oromoo, English, or a mix.

Find the "Transaction Number" (labeled as "Transaction Number", "Transaction No", "የግዕዛን ቁጥር", or similar). It is a 10-character alphanumeric string, always uppercase.

Return a JSON object with:
- "transaction_number": the 10-char alphanumeric TXID (uppercase). Empty string if not found.
- "found_label": the exact label text you found near the transaction number. Empty string if not found.
- "all_text": the full OCR text extracted from the image.

Return ONLY valid JSON, no markdown, no code blocks.`,
              },
            ],
          },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(502).json({
        success: false,
        error: `Mistral API error (${response.status}): ${errText.slice(0, 300)}`,
      });
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content ?? '';

    let parsed: { transaction_number?: string; found_label?: string; all_text?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const fallbackTxid = extractTxid(content);
      return res.status(200).json({
        success: !!fallbackTxid,
        txid: fallbackTxid ?? '',
        rawText: content.slice(0, 4000),
      });
    }

    let txid = (parsed.transaction_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!TXID_REGEX.test(txid)) {
      const fromText = extractTxid(parsed.all_text || content);
      if (fromText) txid = fromText;
    }

    if (txid.length > 10) {
      txid = txid.slice(0, 10);
    }

    return res.status(200).json({
      success: txid.length === 10,
      txid,
      type: 'telebirr',
      rawText: (parsed.all_text || '').slice(0, 4000),
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err?.message || 'OCR failed.',
    });
  }
}
