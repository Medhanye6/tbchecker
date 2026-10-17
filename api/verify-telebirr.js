const cheerio = require('cheerio');

function extractSettledAmountRegex(html) {
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

function extractServiceFeeRegex(html) {
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

function extractReceiptNoRegex(html) {
  const m = html.match(
    /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i
  );
  return m ? m[1].trim() : null;
}

function extractDateRegex(html) {
  const m = html.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
  return m ? m[1].trim() : null;
}

function extractWithRegex(html, labelPattern) {
  const escaped = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<td[^>]*>\\s*${escaped}\\s*<\\/td>\\s*<td[^>]*>\\s*([^<]+)`,
    'i'
  );
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : null;
}

function extractNextCellText($, labels) {
  for (const label of labels) {
    const cells = $('td').filter(function () {
      return $(this).text().includes(label);
    });
    if (cells.length > 0) {
      const value = cells.first().next('td').text().trim();
      if (value) return value.replace(/\s+/g, ' ');
    }
  }
  return '';
}

function scrapeTelebirrReceipt(html) {
  const $ = cheerio.load(html);

  const getSettledAmount = () => {
    const regexAmount = extractSettledAmountRegex(html);
    if (regexAmount) return regexAmount;
    return extractNextCellText($, ['የተከፈለው መጠን', 'Settled Amount']);
  };

  const getServiceFee = () => {
    const regexFee = extractServiceFeeRegex(html);
    if (regexFee) return regexFee;
    return extractNextCellText($, ['የአገልግሎት ክፍያ', 'Service fee']);
  };

  const getReceiptNo = () => {
    const regexReceipt = extractReceiptNoRegex(html);
    if (regexReceipt) return regexReceipt;
    return $('td.receipttableTd.receipttableTd2').eq(1).text().trim();
  };

  const getPaymentDate = () => {
    const regexDate = extractDateRegex(html);
    if (regexDate) return regexDate;
    return $('.receipttableTd')
      .filter(function () {
        return $(this).text().includes('-202');
      })
      .first()
      .text()
      .trim();
  };

  let creditedPartyName =
    extractWithRegex(html, 'የገንዘብ ተቀባይ ስም/Credited Party name') ||
    extractNextCellText($, ['የገንዘብ ተቀባይ ስም/Credited Party name', 'Credited Party name']);
  let creditedPartyAccountNo =
    extractWithRegex(html, 'የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no') ||
    extractNextCellText($, [
      'የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no',
      'Credited party account no',
    ]);
  let bankName = '';

  const bankAccountNumberRaw =
    extractWithRegex(html, 'የባንክ አካውንት ቁጥር/Bank account number') ||
    extractNextCellText($, ['የባንክ አካውንት ቁጥር/Bank account number', 'Bank account number']);

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
      extractNextCellText($, ['የከፋይ ስም/Payer Name', 'Payer Name']),
    payerTelebirrNo:
      extractWithRegex(html, 'የከፋይ ቴሌብር ቁ./Payer telebirr no.') ||
      extractNextCellText($, [
        'የከፋይ ቴሌብር ቁ./Payer telebirr no.',
        'Payer telebirr no.',
        'Payer Telebirr No.',
      ]),
    creditedPartyName,
    creditedPartyAccountNo,
    transactionStatus:
      extractWithRegex(html, 'የክፍያው ሁኔታ/transaction status') ||
      extractNextCellText($, [
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
      extractNextCellText($, ['የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT', 'Service fee VAT']),
    totalPaidAmount:
      extractWithRegex(html, 'ጠቅላላ የተከፈለ/Total Paid Amount') ||
      extractNextCellText($, ['ጠቅላላ የተከፈለ/Total Paid Amount', 'Total Paid Amount']),
    bankName,
    customerNote:
      extractWithRegex(html, 'የደንበኛ መልዕክት/Customer Note') ||
      extractNextCellText($, ['የደንበኛ መልዕክት/Customer Note', 'Customer Note']),
  };
}

function isValidReceipt(r) {
  return !!(r.receiptNo && r.payerName && r.transactionStatus);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const reference = String((req.body && req.body.reference) || '')
    .trim()
    .toUpperCase();
  if (!reference || !/^[A-Z0-9]{10}$/.test(reference)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid reference. Must be 10 uppercase alphanumeric characters.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const url = `https://transactioninfo.ethiotelecom.et/receipt/${encodeURIComponent(reference)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'am-ET,am;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      clearTimeout(timeout);
      return res.status(404).json({
        success: false,
        error: `Telebirr returned HTTP ${response.status}`,
      });
    }

    const html = await response.text();
    clearTimeout(timeout);

    if (!html || html.length < 100) {
      return res.status(404).json({
        success: false,
        error: 'Empty or invalid response from Telebirr.',
      });
    }

    const receipt = scrapeTelebirrReceipt(html);

    if (!isValidReceipt(receipt)) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    return res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    clearTimeout(timeout);
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return res.status(504).json({
        success: false,
        error: 'Telebirr endpoint timed out. It may be blocking non-Ethiopian IPs.',
      });
    }
    return res.status(502).json({
      success: false,
      error: (err && err.message) || 'Failed to fetch receipt from Telebirr.',
    });
  }
};
