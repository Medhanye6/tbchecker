const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

const TRANSCRIBE_PROMPT = `Transcribe ALL text visible in this image exactly as shown, preserving line breaks and order. This is usually an Ethiopian Telebirr payment receipt, which may be in Amharic, Tigrinya, Afaan Oromoo, or English.

Output ONLY the transcription text. Do not add commentary, summaries, or explanations.`;

const LABEL_TXID_REGEX =
  /(?:Transaction\s*Number|Transaction\s*No|Transaction\s*ID|TXID|Receipt\s*No|Invoice\s*No\.?|የግዕዛን\s*ቁጥር|ግዕዛን\s*ቁጥር|የክፍያ\s*ቁጥር|የግብይት\s*ቁጥር)\s*[:#\-]?\s*([A-Z0-9]{10})(?![A-Z0-9])/i;

const BLOCKED_TXID_WORDS = new Set([
  'TRANSACTION',
  'TRANSACTIONN',
  'RECEIPTNO',
  'TELEBIRR',
  'COMPLETED',
  'CANCELLED',
  'ETHIOPIA',
  'CUSTOMER',
  'INVOICENO',
  'PAYMENTDAT',
]);

function isLabeledTxid(s) {
  return /^[A-Z0-9]{10}$/.test(s) && !BLOCKED_TXID_WORDS.has(s);
}

function isPlausibleTxid(s) {
  return (
    /^[A-Z0-9]{10}$/.test(s) &&
    /[0-9]/.test(s) &&
    /[A-Z]/.test(s) &&
    !BLOCKED_TXID_WORDS.has(s)
  );
}

function extractTxid(text) {
  const upper = String(text).toUpperCase();

  const labelMatch = upper.match(LABEL_TXID_REGEX);
  if (labelMatch && isLabeledTxid(labelMatch[1])) return labelMatch[1];

  const allMatches = upper.match(/[A-Z0-9]{10}(?![A-Z0-9])/g);
  if (allMatches) {
    const candidates = allMatches.filter(isPlausibleTxid);
    if (candidates.length > 0) return candidates[0];
  }

  return null;
}

module.exports = async function handler(req, res) {
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

  const imageBase64 = req.body && req.body.image;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing "image" field. Provide a base64-encoded image string.',
    });
  }

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  try {
    const response = await fetch(MISTRAL_CHAT_URL, {
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
              { type: 'image_url', image_url: dataUrl },
              { type: 'text', text: TRANSCRIBE_PROMPT },
            ],
          },
        ],
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
    const text =
      (result &&
        result.choices &&
        result.choices[0] &&
        result.choices[0].message &&
        result.choices[0].message.content) ||
      '';

    const txid = extractTxid(text) || '';

    return res.status(200).json({
      success: txid.length === 10,
      txid,
      type: 'telebirr',
      rawText: String(text).slice(0, 6000),
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: (err && err.message) || 'OCR failed.',
    });
  }
};
