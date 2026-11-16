// Ethiopian SMS Payment Parser for Telebirr and CBE / CBE Birr
// Automatically extracts Transaction Reference ID, Amount, Sender, and Provider

export function parseEthiopianSms(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isSms: false,
      referenceCode: null,
      amount: null,
      senderPhone: null,
      provider: 'generic',
    };
  }

  const text = rawText.trim();
  const isLikelySms =
    text.length > 25 &&
    (/telebirr|cbe|cbebirr|ብር|etb|trans|txn|account|ተቀማጭ|ገቢ|ሂሳብ/i.test(text) ||
      /\b(?:TB|FT)[0-9A-Z]{6,}\b/i.test(text));

  let referenceCode = null;
  let amount = null;
  let senderPhone = null;
  let provider = 'generic';

  if (/cbe|commercial bank|cbebirr/i.test(text)) {
    provider = 'cbe';
  } else if (/telebirr|ቴሌብር/i.test(text)) {
    provider = 'telebirr';
  }

  // --- 1. Extract Transaction Reference Code ---
  // A. Telebirr TB format: e.g. TB241116091234, TB123456789
  const tbMatch = text.match(/\b(TB[0-9A-Z]{8,20})\b/i);
  if (tbMatch) {
    referenceCode = tbMatch[1].toUpperCase();
    provider = 'telebirr';
  }

  // B. CBE FT format: e.g. FT24312ABCDE, FT24321948201
  if (!referenceCode) {
    const ftMatch = text.match(/\b(FT[0-9A-Z]{9,22})\b/i);
    if (ftMatch) {
      referenceCode = ftMatch[1].toUpperCase();
      provider = 'cbe';
    }
  }

  // C. Generic Transaction Number/ID pattern in English or Amharic
  if (!referenceCode) {
    const transMatch = text.match(
      /(?:trans(?:action)?\.?\s*(?:no|id|number|code)|txn\s*id|ትራንዛክሽን\s*ቁጥር|የመለያ\s*ቁጥር|ref(?:erence)?\.?\s*(?:no|id|code)?)[:\s]+([A-Z0-9]{8,24})\b/i
    );
    if (transMatch) {
      referenceCode = transMatch[1].toUpperCase();
    }
  }

  // D. Fallback: if user pasted a standalone clean code (6 to 24 alphanumeric chars)
  if (!referenceCode && !isLikelySms) {
    const standaloneMatch = text.match(/^[A-Z0-9-]{6,24}$/i);
    if (standaloneMatch) {
      referenceCode = standaloneMatch[0].toUpperCase();
    }
  }

  // --- 2. Extract Amount ---
  // Pattern 1: ETB / ብር followed by number (e.g. "ETB 200.00", "ETB 500", "ብር 150")
  const amtMatch1 = text.match(/(?:ETB|ብር)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch1) {
    const val = parseFloat(amtMatch1[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) amount = val;
  }

  // Pattern 2: Number followed by ETB / ብር (e.g. "200.00 ETB", "150 ብር")
  if (!amount) {
    const amtMatch2 = text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|ብር)/i);
    if (amtMatch2) {
      const val = parseFloat(amtMatch2[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amount = val;
    }
  }

  // Pattern 3: Amount after keywords
  if (!amount) {
    const amtMatch3 = text.match(
      /(?:amount|ተቀማጭ|ገቢ|transferred|credited)[:\s]+(?:ETB|ብር)?\s*([\d,]+(?:\.\d{1,2})?)/i
    );
    if (amtMatch3) {
      const val = parseFloat(amtMatch3[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amount = val;
    }
  }

  // --- 3. Extract Phone Number ---
  const phoneMatch = text.match(/\b(?:\+?251|0)([79]\d{8})\b/);
  if (phoneMatch) {
    senderPhone = '0' + phoneMatch[1];
  }

  return {
    isSms: isLikelySms,
    referenceCode,
    amount,
    senderPhone,
    provider,
    rawText: text,
  };
}
