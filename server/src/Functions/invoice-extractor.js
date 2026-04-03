import axios from "axios";
import Groq from "groq-sdk";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  buildExpenseAccountPromptText,
  resolveSuggestedExpenseAccount,
} from "../utils/zohoExpenseAccountCatalog.js";
import { normalizeIndianGstin } from "../utils/zohoGstState.js";
import { buildTdsPromptText, resolveSuggestedBillTds } from "../utils/zohoTds.js";

/* =========================
   GROQ INIT
========================= */
const getGroqClient = () => {
  const key = String(process.env.GROQ_API_KEY || "").trim();
  if (!key) {
    throw new ApiError(500, "GROQ_API_KEY is not configured");
  }

  return new Groq({ apiKey: key });
};


/* =========================
   YOUR ORIGINAL PROMPT (UNCHANGED)
========================= */
const extractionPrompt = `You are an expert Indian GST document analyzer. Analyze the provided document (invoice, receipt, bill) and extract all relevant information.

FIRST, categorize this document:
- "expense": Purchase invoices, bills for goods/services bought, vendor invoices
- "revenue": Sales invoices, income receipts, customer invoices where we are the seller
- "asset": Invoices for capital purchases like equipment, machinery, property
- "liability": Loan documents, credit notes payable, deferred payments

Then extract these fields:
1. document_category: "expense", "revenue", "asset", or "liability"
2. invoice_number: The invoice/bill number
3. date_of_issue: Date in YYYY-MM-DD format
4. due_date: Payment due date in YYYY-MM-DD format (if available)
5. vendor_name: Name of the seller/vendor company
6. vendor_gstin: Vendor's Indian GSTIN only (15 characters). If the seller is foreign or the document only shows a foreign tax ID/UEN/VAT/customer GST, return null
7. vendor_city: Vendor's city/location
8. vendor_country: Vendor's country. For overseas vendors, extract the country name like Singapore
9. vendor_gst_registration_status: "registered", "unregistered", or "composition"
10. vendor_business_type: "B2B" or "B2C"
11. customer_name: Name of the buyer/customer
12. customer_city: Customer's city/location
13. place_of_supply: State where goods/services are supplied
14. taxable_amount: Exact Sub Total (Pre Tax) amount BEFORE any GST or taxes or discounts are strictly applied.
15. cgst: Central GST amount (number, 0 if inter-state)
16. sgst: State GST amount (number, 0 if inter-state)
17. igst: Integrated GST amount (number, 0 if intra-state)
18. total_gst: Sum of all GST components (number)
19. total_with_gst: Final Total Amount of the invoice including all GST and discounts (number)
20. expense_account: Exact Zoho account name for the bill
21. expense_account_group: "expense" or "cost_of_goods_sold"
22. payment_mode: "Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"
23. tds_nature: One of "commission_brokerage", "professional_fees", "technical_services", "rent", "contractor", "interest_other_than_securities", or "none"
24. tds_amount: Provide the exact TDS amount deducted on this invoice if explicitly visible on the document. If no TDS amount is shown, provide 0.
25. tds_reasoning: Explain the TDS treatment (Assume the vendor/customer always has a PAN card, so do not apply the 20% rate. Only apply normal category rates like 2% or 10%).
26. gst_reasoning: Explain the GST treatment
27. confidence: Your confidence score from 0 to 100

Vendor tax rules:
- vendor_gstin must only contain the seller/vendor's Indian 15-character GSTIN.
- Never copy the purchaser/customer GST or customer tax ID into vendor_gstin.
- If the vendor is outside India or the document shows a foreign registration number like UEN, VAT ID, or TAX ID, set vendor_gstin to null and fill vendor_country.

${buildExpenseAccountPromptText()}

${buildTdsPromptText()}

Critical extraction quality rules:
- NEVER HALLUCINATE OR MAKE UP ANY DATA. IF A FIELD IS NOT CLEARLY VISIBLE, RETURN null.
- DO NOT invent placeholder names like "XYZ Enterprises", "ABC Inc", "John Doe", or dummy GSTINs/addresses. Return null if absent.
- Never return placeholder values like "UNKNOWN", "N/A", "-" when the value is visible in the document.
- For receipts (including foreign SaaS receipts) where GST lines are absent, set cgst=0, sgst=0, igst=0, total_gst=0.
- For receipts with labels like "Subtotal", "Total", or "Amount paid":
  - taxable_amount should be Subtotal (or Total if subtotal is not separately available)
  - total_with_gst should be final paid/total amount
- The amounts MUST be exactly as printed on the document. Do not do currency conversion.
- Parse dates like "September 5, 2025" into YYYY-MM-DD.
- If vendor is foreign and only customer Indian GST is present, vendor_gstin must be null.
- Read both key-value labels and table totals carefully before deciding fields.
- If GST (CGST/SGST/IGST) is listed per line item and there is a final "Total" row, treat that final total as total_with_gst.
- In line-item GST tables, aggregate CGST/SGST/IGST from totals (or summed item taxes) and compute taxable_amount as total_with_gst - (cgst + sgst + igst).
- Handle intra-state (CGST+SGST), inter-state (IGST), or mixed tax rows safely; missing tax components must be 0.
- Validate arithmetic consistency: taxable_amount + total_gst should match total_with_gst within small rounding tolerance, and avoid double-counting GST.
- vendor_name must be the precise seller (the issuer/from party), extracting the exact legal business name without modification. Do not guess it.
- invoice_number must be copied exactly as printed, including full suffix/prefix after separators like "-", "/", "_". Never truncate (example: keep "15439A58-0015", not "15439A58").
- Do not strip punctuation inside legal entity names (for example "Anthropic, PBC").

Return ONLY valid JSON with all fields, no other text or markdown.`;


/* =========================
   DOWNLOAD FILE FROM R2
========================= */
async function downloadFile(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxContentLength: 12 * 1024 * 1024, // 12MB
    });

    const rawContentType = String(response.headers["content-type"] || "").toLowerCase();
    const contentType = rawContentType.split(";")[0].trim();
    const urlPath = String(url || "").toLowerCase();

    let normalizedMime = contentType;

    if (!normalizedMime || normalizedMime === "application/octet-stream") {
      if (urlPath.includes(".pdf")) normalizedMime = "application/pdf";
      else if (urlPath.includes(".png")) normalizedMime = "image/png";
      else if (urlPath.includes(".jpg") || urlPath.includes(".jpeg")) normalizedMime = "image/jpeg";
      else if (urlPath.includes(".webp")) normalizedMime = "image/webp";
    }

    if (!normalizedMime.includes("pdf") && !normalizedMime.includes("image")) {
      throw new ApiError(400, "Unsupported file type");
    }

    return {
      buffer: Buffer.from(response.data),
      mime: normalizedMime.includes("pdf") ? "application/pdf" : normalizedMime
    };

  } catch {
    throw new ApiError(400, "Unable to download document");
  }
}

async function extractTextFromPdf(buffer) {
  try {
    const parsed = await pdf(buffer);
    const raw = String(parsed?.text || "");
    const text = raw
      .replace(/\u00A0/g, " ")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text;
  } catch {
    return "";
  }
}

const FX_CACHE = new Map();
const FX_CACHE_TTL_MS = 30 * 60 * 1000;

const INDIAN_GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/i;

const looksMissing = (value) => {
  if (value == null) return true;
  const text = String(value).trim().toLowerCase();
  if (!text) return true;
  return ["unknown", "n/a", "na", "-", "null", "undefined"].includes(text);
};

const parseAmount = (value) => {
  const cleaned = String(value || "")
    .replace(/[₹$,£€]/g, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const extractNumericTokens = (line = "") => {
  const matches = String(line || "").match(/\d+(?:\.\d+)?/g) || [];
  return matches.map((token) => Number(token)).filter((n) => Number.isFinite(n));
};

const almostEqual = (a, b, tolerance = 1.5) => {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) <= tolerance;
};

const aggregateItemLevelGstFromRows = (lines = [], { hasCgst = false, hasSgst = false, hasIgst = false } = {}) => {
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let rowCount = 0;

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!/^\d+\b/.test(line)) continue;

    const nums = extractNumericTokens(line);
    if (nums.length < 6) continue;

    const rowTotal = Number(nums[nums.length - 1] || 0);
    if (!(rowTotal > 0)) continue;

    let rowCgst = 0;
    let rowSgst = 0;
    let rowIgst = 0;

    // Common GST table row tail with both taxes:
    // [... taxable, cgst%, cgst_amount, sgst%, sgst_amount, cess%, addl_cess, total]
    if (hasCgst && hasSgst && nums.length >= 8) {
      rowCgst = Number(nums[nums.length - 6] || 0);
      rowSgst = Number(nums[nums.length - 4] || 0);
    }

    // Common IGST table row tail:
    // [... taxable, igst%, igst_amount, (optional cess), total]
    if (hasIgst) {
      const candidate1 = Number(nums[nums.length - 4] || 0);
      const candidate2 = Number(nums[nums.length - 3] || 0);
      rowIgst = candidate1 > 0 ? candidate1 : candidate2 > 0 ? candidate2 : 0;
    }

    const rowGst = rowCgst + rowSgst + rowIgst;
    if (!(rowGst > 0) || rowGst >= rowTotal) continue;

    cgst += rowCgst;
    sgst += rowSgst;
    igst += rowIgst;
    rowCount += 1;
  }

  return {
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    igst: Number(igst.toFixed(2)),
    rowCount,
  };
};

const deriveLineItemTaxTotals = (source = "", lines = []) => {
  const text = String(source || "");
  const hasItemTable = /\b(?:sr\.?\s*no|item\s*description|qty|taxable\s*value)\b/i.test(text);
  const hasCgst = /\bcgst\b/i.test(text);
  const hasSgst = /\bsgst\b/i.test(text);
  const hasIgst = /\bigst\b/i.test(text);

  if (!hasItemTable || !(hasCgst || hasSgst || hasIgst)) return null;

  const totalLineCandidates = lines.filter((line) =>
    /\b(?:grand\s*total|total\s*amount|total)\b/i.test(String(line || "")) && /\d/.test(String(line || ""))
  );
  const totalLine = totalLineCandidates[totalLineCandidates.length - 1] || "";

  let nums = extractNumericTokens(totalLine);
  if (nums.length < 2) {
    const compact = text.replace(/[ \t]+/g, " ");
    const inlineTotal = compact.match(/(?:grand\s*total|total\s*amount|\btotal\b)\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1];
    const parsedInlineTotal = parseAmount(inlineTotal);
    if (!(parsedInlineTotal > 0)) return null;
    nums = [parsedInlineTotal];
  }

  const totalWithGst = Number(nums[nums.length - 1] || 0);
  if (!(totalWithGst > 0)) return null;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (hasCgst && hasSgst && hasIgst && nums.length >= 5) {
    // Rare case: [... cgst_total, sgst_total, igst_total, final_total]
    cgst = Number(nums[nums.length - 4] || 0);
    sgst = Number(nums[nums.length - 3] || 0);
    igst = Number(nums[nums.length - 2] || 0);
  } else if (hasCgst && hasSgst && nums.length >= 4) {
    // Expected tail for many GST tables: [..., cgst_total, sgst_total, final_total]
    cgst = Number(nums[nums.length - 3] || 0);
    sgst = Number(nums[nums.length - 2] || 0);
  } else if (hasIgst && nums.length >= 3) {
    // Expected tail: [..., igst_total, final_total]
    igst = Number(nums[nums.length - 2] || 0);
  }

  // Fallback: if totals row does not contain GST totals clearly, sum from item rows.
  if (!(cgst + sgst + igst > 0)) {
    const fromRows = aggregateItemLevelGstFromRows(lines, { hasCgst, hasSgst, hasIgst });
    cgst = fromRows.cgst;
    sgst = fromRows.sgst;
    igst = fromRows.igst;
  }

  const totalGst = Number((cgst + sgst + igst).toFixed(2));
  if (!(totalGst > 0)) return null;
  if (totalGst >= totalWithGst) return null;

  const taxableAmount = Math.max(0, Number((totalWithGst - totalGst).toFixed(2)));
  if (!almostEqual(taxableAmount + totalGst, totalWithGst, 2)) return null;

  return {
    line_item_tax_mode: true,
    taxable_amount: taxableAmount,
    cgst,
    sgst,
    igst,
    total_gst: totalGst,
    total_with_gst: totalWithGst,
  };
};

const parseDateToISO = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoLike = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoLike) {
    const yyyy = isoLike[1];
    const mm = String(isoLike[2]).padStart(2, "0");
    const dd = String(isoLike[3]).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const dd = String(dmy[1]).padStart(2, "0");
    const mm = String(dmy[2]).padStart(2, "0");
    const yyyy = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

const sanitizeInvoiceNumber = (value) => {
  const token = String(value || "")
    .trim()
    .replace(/^(?:invoice\s*number|invoice\s*no\.?|receipt\s*number|receipt\s*no\.?|bill\s*number|bill\s*no\.?|invoice|invoic|receipt|bill|number|no\.?|id)\s*[:\-#]?\s*/i, "")
    .replace(/[–—]/g, "-")
    .replace(/\s*([\-_/])\s*/g, "$1")
    .replace(/^[#:\-\s]+/, "")
    .replace(/[.,;:]+$/, "");

  return token || null;
};

const normalizeInvoiceToken = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^A-Z0-9\-_/]/g, "");

const looksLikeInvoiceNumberToken = (value) => {
  const token = sanitizeInvoiceNumber(value);
  if (!token) return false;
  if (token.length < 5 || token.length > 50) return false;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(token)) return false;
  if (/^\d+(?:\.\d{1,2})?$/.test(token)) return false;
  if (INDIAN_GSTIN_REGEX.test(token)) return false;

  const hasAlpha = /[A-Z]/i.test(token);
  const hasDigit = /\d/.test(token);
  if (!(hasAlpha && hasDigit)) return false;

  return /^[A-Z0-9][A-Z0-9\-_/]*$/i.test(token);
};

const extractInvoiceNumberFromSegment = (segment) => {
  const text = String(segment || "").trim();
  if (!text) return null;

  const rawCandidates = [];
  const seen = new Set();

  const collect = (regex) => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match?.[1] || match?.[0];
      if (!raw) continue;
      const cleaned = sanitizeInvoiceNumber(raw);
      const key = normalizeInvoiceToken(cleaned);
      if (!cleaned || !key || seen.has(key)) continue;
      seen.add(key);
      rawCandidates.push(cleaned);
    }
  };

  // Prefer IDs that include explicit separators, even when OCR inserts spaces around them.
  collect(/([A-Z0-9]{2,}(?:\s*[-_/]\s*[A-Z0-9]{1,}){1,})/gi);
  // Fallback to compact alphanumeric token.
  collect(/([A-Z0-9][A-Z0-9\-_/]{4,})/gi);

  const ranked = rawCandidates
    .filter((candidate) => looksLikeInvoiceNumberToken(candidate))
    .sort((a, b) => {
      const score = (value) => {
        const hasSeparator = /[-_/]/.test(value) ? 100 : 0;
        return hasSeparator + String(value).length;
      };
      return score(b) - score(a);
    });

  return ranked[0] || null;
};

const shouldPreferHintInvoiceNumber = (currentValue, hintValue) => {
  const hint = sanitizeInvoiceNumber(hintValue);
  if (!looksLikeInvoiceNumberToken(hint)) return false;

  const current = sanitizeInvoiceNumber(currentValue);
  if (looksMissing(current) || !looksLikeInvoiceNumberToken(current)) return true;

  const normCurrent = normalizeInvoiceToken(current);
  const normHint = normalizeInvoiceToken(hint);

  if (!normHint || normCurrent === normHint) return false;
  if (normHint.startsWith(`${normCurrent}-`) || normHint.startsWith(`${normCurrent}/`) || normHint.startsWith(`${normCurrent}_`)) {
    return true;
  }

  return normHint.length > normCurrent.length && normHint.includes("-") && normCurrent === normHint.split("-")[0];
};

const sanitizeVendorName = (value) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/^vendor\s*name\s*[:\-]?\s*/i, "")
    .replace(/^seller\s*[:\-]?\s*/i, "")
    .replace(/\s{2,}/g, " ");

  return cleaned || null;
};

const isLowQualityVendorName = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  if (["unknown", "unknown vendor", "vendor", "seller", "na", "n/a", "null"].includes(normalized)) return true;
  if (/^bill\s*to$/i.test(normalized)) return true;
  return normalized.length < 3;
};

function deriveInvoiceHintsFromText(text) {
  const source = String(text || "").trim();
  if (!source) return {};

  const lines = source.split("\n").map((l) => l.trim()).filter(Boolean);
  const compact = source.replace(/[ \t]+/g, " ");

  const extractInvoiceNumber = () => {
    const invoiceLabelRegex = /^(invoice|receipt|bill)\s*(number|no\.?|#|id)?\s*[:#-]?\s*/i;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!/^(invoice|receipt|bill)\s*(number|no\.?|#|id)?/i.test(line)) continue;

      const labeledTail = line.replace(invoiceLabelRegex, "").trim();
      const fromTail = extractInvoiceNumberFromSegment(labeledTail);
      if (fromTail) return fromTail;

      const fromWholeLine = extractInvoiceNumberFromSegment(line);
      if (fromWholeLine) return fromWholeLine;

      const stitchedTail = `${labeledTail} ${lines[i + 1] || ""}`.trim();
      const fromStitchedTail = extractInvoiceNumberFromSegment(stitchedTail);
      if (fromStitchedTail) return fromStitchedTail;

      const afterColon = sanitizeInvoiceNumber(line.split(":").slice(1).join(":").trim());
      if (looksLikeInvoiceNumberToken(afterColon)) return afterColon;

      const next = extractInvoiceNumberFromSegment(lines[i + 1]);
      if (next) return next;
    }

    const compactSegment = compact.match(/(?:invoice\s*number|invoice\s*no\.?|invoice\s*#|receipt\s*number|receipt\s*no\.?|bill\s*number|bill\s*no\.?|bill\s*#)\s*[:#-]?\s*([^\n]{0,80})/i)?.[1];
    const compactExtracted = extractInvoiceNumberFromSegment(compactSegment);
    if (compactExtracted) return compactExtracted;

    const topSectionExtracted = extractInvoiceNumberFromSegment(lines.slice(0, 35).join(" "));
    if (topSectionExtracted) return topSectionExtracted;

    return null;
  };

  const companyLine = lines.find((line) =>
    /\b(limited|ltd|llp|private|pvt|inc|corp|corporation|company|co\.?|technologies|solutions|services|pbc|llc|plc|gmbh|pte|sa|bv)\b/i.test(line)
  );

  const invoiceNo = extractInvoiceNumber();

  const dateRaw =
    compact.match(/(?:date\s*paid|date\s*of\s*issue|invoice\s*date|date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i)?.[1] ||
    null;

  const billToName =
    source.match(/bill\s*to\s*\n\s*([^\n]+)/i)?.[1]?.trim() ||
    source.match(/bill\s*to\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim() ||
    null;

  const subtotalRaw = compact.match(/(?:sub\s*total|subtotal)\s*[:\-]?\s*[₹$£€]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1] || null;
  const totalRaw =
    compact.match(/(?:grand\s*total|amount\s*paid|total\s*paid|total(?!\s*tokens|ling))\s*[:\-]?\s*[₹$£€]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)?.[1] ||
    compact.match(/[₹$£€]\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s+paid\s+on/i)?.[1] ||
    null;

  const paymentModeRaw = compact.match(/(?:payment\s*method|payment\s*mode)\s*[:\-]?\s*([^\n]+)/i)?.[1] || null;

  const knownStates = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana",
    "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
    "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "puducherry", "chandigarh",
    "jammu and kashmir", "ladakh",
  ];

  const placeOfSupply = lines.find((line) =>
    knownStates.some((state) => line.toLowerCase().includes(state))
  ) || null;

  const foreignCountryLine = lines.find((line) =>
    /\b(ireland|singapore|united states|usa|uk|united kingdom|canada|australia|germany|france|uae|netherlands)\b/i.test(line)
  );

  const gstinMatch = compact.match(INDIAN_GSTIN_REGEX)?.[0] || null;

  const subtotal = parseAmount(subtotalRaw);
  const total = parseAmount(totalRaw);
  const lineItemTaxTotals = deriveLineItemTaxTotals(source, lines);

  let paymentMode = null;
  if (paymentModeRaw) {
    if (/visa|mastercard|card|amex/i.test(paymentModeRaw)) paymentMode = "Credit Card";
    else if (/upi/i.test(paymentModeRaw)) paymentMode = "UPI";
    else if (/bank|wire|neft|rtgs|imps/i.test(paymentModeRaw)) paymentMode = "Bank Transfer";
    else if (/cash/i.test(paymentModeRaw)) paymentMode = "Cash";
    else if (/cheque|check/i.test(paymentModeRaw)) paymentMode = "Cheque";
  }

  return {
    document_category: /\breceipt\b/i.test(compact) ? "expense" : undefined,
    invoice_number: invoiceNo,
    date_of_issue: parseDateToISO(dateRaw),
    vendor_name: companyLine || null,
    customer_name: billToName,
    vendor_country: foreignCountryLine || null,
    vendor_gstin: gstinMatch,
    place_of_supply: placeOfSupply,
    taxable_amount: subtotal ?? total ?? null,
    total_with_gst: total ?? subtotal ?? null,
    payment_mode: paymentMode,
    ...(lineItemTaxTotals || {}),
  };
}

function detectDocumentCurrency(text = "", extracted = {}) {
  const source = `${String(text || "")}\n${JSON.stringify(extracted || {})}`.toLowerCase();

  if (/\b(?:usd|us\s*dollar|dollars)\b/.test(source) || /\$\s*\d/.test(source)) {
    return "USD";
  }

  if (/\b(?:inr|rs\.?|rupees?)\b/.test(source) || /₹\s*\d/.test(source)) {
    return "INR";
  }

  return null;
}

async function getFxRate(baseCurrency, quoteCurrency) {
  const base = String(baseCurrency || "").toUpperCase();
  const quote = String(quoteCurrency || "").toUpperCase();
  if (!base || !quote) return null;
  if (base === quote) return 1;

  const key = `${base}_${quote}`;
  const cached = FX_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < FX_CACHE_TTL_MS) {
    return cached.rate;
  }

  const urls = [
    `https://open.er-api.com/v6/latest/${base}`,
    `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`,
  ];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { timeout: 5000 });
      const rate = Number(data?.rates?.[quote]);
      if (Number.isFinite(rate) && rate > 0) {
        FX_CACHE.set(key, { rate, fetchedAt: Date.now() });
        return rate;
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

function convertToInr(extracted = {}, fxRate = null, sourceCurrency = "") {
  const rate = Number(fxRate);
  if (!Number.isFinite(rate) || rate <= 0) return extracted;

  const monetaryFields = [
    "taxable_amount",
    "cgst",
    "sgst",
    "igst",
    "total_gst",
    "total_with_gst",
    "tds_amount",
  ];

  const rounded = (n) => Number((Number(n) * rate).toFixed(2));
  const next = { ...extracted };

  monetaryFields.forEach((field) => {
    const value = Number(next[field]);
    if (Number.isFinite(value) && value > 0) {
      next[field] = rounded(value);
    }
  });

  next.original_currency = String(sourceCurrency || "").toUpperCase();
  next.currency = "INR";
  next.exchange_rate = rate;

  return next;
}

function mergeWithTextHints(extracted = {}, hints = {}) {
  const merged = { ...extracted };

  const setIfMissing = (key) => {
    if (looksMissing(merged[key]) && !looksMissing(hints[key])) {
      merged[key] = hints[key];
    }
  };

  [
    "document_category",
    "invoice_number",
    "date_of_issue",
    "vendor_name",
    "vendor_country",
    "customer_name",
    "place_of_supply",
    "payment_mode",
  ].forEach(setIfMissing);

  if (shouldPreferHintInvoiceNumber(merged.invoice_number, hints.invoice_number)) {
    merged.invoice_number = sanitizeInvoiceNumber(hints.invoice_number);
  } else {
    merged.invoice_number = sanitizeInvoiceNumber(merged.invoice_number);
  }

  if (isLowQualityVendorName(merged.vendor_name) && !looksMissing(hints.vendor_name)) {
    merged.vendor_name = sanitizeVendorName(hints.vendor_name);
  } else {
    merged.vendor_name = sanitizeVendorName(merged.vendor_name);
  }

  const numericIfMissing = (key) => {
    const current = Number(merged[key]);
    const fallback = Number(hints[key]);
    if (!(current > 0) && Number.isFinite(fallback) && fallback > 0) {
      merged[key] = fallback;
    }
  };

  numericIfMissing("taxable_amount");
  numericIfMissing("total_with_gst");

  if (hints.line_item_tax_mode && Number(hints.total_with_gst || 0) > 0) {
    const hintedCgst = Number(hints.cgst || 0);
    const hintedSgst = Number(hints.sgst || 0);
    const hintedIgst = Number(hints.igst || 0);
    const hintedTotal = Number(hints.total_with_gst || 0);

    if (hintedCgst > 0 || hintedSgst > 0 || hintedIgst > 0) {
      merged.cgst = hintedCgst;
      merged.sgst = hintedSgst;
      merged.igst = hintedIgst;
      merged.total_gst = Number((hintedCgst + hintedSgst + hintedIgst).toFixed(2));
      merged.total_with_gst = hintedTotal;
      merged.taxable_amount = Math.max(0, Number((hintedTotal - merged.total_gst).toFixed(2)));
    }
  }

  const cgst = Number(merged.cgst || 0);
  const sgst = Number(merged.sgst || 0);
  const igst = Number(merged.igst || 0);
  const totalGst = Number(merged.total_gst || 0);

  if (!(totalGst > 0)) {
    merged.total_gst = cgst + sgst + igst;
  }

  if (!(Number(merged.total_with_gst || 0) > 0) && Number(merged.taxable_amount || 0) > 0) {
    merged.total_with_gst = Number(merged.taxable_amount || 0) + Number(merged.total_gst || 0);
  }

  if (!(Number(merged.taxable_amount || 0) > 0) && Number(merged.total_with_gst || 0) > 0) {
    merged.taxable_amount = Math.max(0, Number(merged.total_with_gst || 0) - Number(merged.total_gst || 0));
  }

  const vendorCountry = String(merged.vendor_country || "").toLowerCase();
  const isForeign = vendorCountry && !vendorCountry.includes("india");
  if (isForeign) {
    merged.vendor_gstin = null;
    merged.cgst = 0;
    merged.sgst = 0;
    merged.igst = 0;
    merged.total_gst = 0;
    if (Number(merged.taxable_amount || 0) <= 0 && Number(merged.total_with_gst || 0) > 0) {
      merged.taxable_amount = Number(merged.total_with_gst || 0);
    }
  }

  return merged;
}


/* =========================
   CALL GROQ
========================= */
async function callGroq({ buffer, mimeType }) {
  try {
    const groq = getGroqClient();

    const isPdf = mimeType.includes("pdf");
    const candidateModels = isPdf
      ? ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
      : [
          "llama-3.2-90b-vision-preview",
          "llama-3.2-11b-vision-preview"
        ];
    let lastModelError = null;

    let pdfText = "";
    if (isPdf) {
      pdfText = await extractTextFromPdf(buffer);
      if (!pdfText || pdfText.length < 50) {
        throw new ApiError(
          400,
          "Could not read text from PDF. Please upload a clear image invoice (JPG/PNG/WEBP) or a text-based PDF."
        );
      }
    }

    const imageMime = String(mimeType || "").toLowerCase().replace("image/jpg", "image/jpeg").split(";")[0].trim();

    if (!isPdf && !["image/jpeg", "image/png", "image/webp"].includes(imageMime)) {
      throw new ApiError(400, "Unsupported image format. Please upload JPG, PNG, or WEBP.");
    }

    if (!isPdf && buffer.length > 3.8 * 1024 * 1024) {
      throw new ApiError(400, "Image is too large for Groq vision input. Please upload an image under 4MB.");
    }

    const dataUrl = !isPdf ? `data:${imageMime};base64,${buffer.toString("base64")}` : null;

    for (const candidateModel of candidateModels) {
      try {
        const response = isPdf
          ? await groq.chat.completions.create({
              model: candidateModel,
              max_tokens: 2048,
              temperature: 0.1,
              messages: [
                {
                  role: "user",
                  content: `${extractionPrompt}\n\nPDF extracted text:\n${pdfText.slice(0, 28000)}`,
                },
              ],
            })
          : await groq.chat.completions.create({
              model: candidateModel,
              max_tokens: 2048,
              temperature: 0.1,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: extractionPrompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: dataUrl,
                      },
                    },
                  ],
                },
              ],
            });

        const text = String(response?.choices?.[0]?.message?.content || "").trim();

        if (!text) throw new Error("Empty AI response");
        return text;
      } catch (modelError) {
        lastModelError = modelError;

        const status = modelError?.status || modelError?.statusCode;
        const message = String(modelError?.message || "");
        const isMissingModel =
          status === 404 || /404|not found|model.*not.*available/i.test(message);

        if (!isMissingModel) {
          throw modelError;
        }
      }
    }

    throw lastModelError || new Error("No compatible Groq model available");
    
  } catch (error) {
    const message = String(error?.message || "");
    const status = error?.status || error?.statusCode;
    const errorType = String(error?.error?.type || "").toLowerCase();

    console.error("❌ Groq API Error:", message);

    if (
      status === 401 ||
      /API key|GROQ_API_KEY|authentication|unauthorized|permission denied/i.test(message) ||
      errorType === "authentication_error"
    ) {
      throw new ApiError(500, "Invalid or missing Groq API key. Please check GROQ_API_KEY in your .env file");
    }
    
    if (status === 404 || /404|not found/i.test(message)) {
      throw new ApiError(500, "Groq model not available for this API key. Try another Groq model.");
    }

    if (/failed to generate json|json_validate_failed|failed_generation/i.test(message)) {
      throw new ApiError(502, "Groq returned non-JSON output. Please retry the request.");
    }

    if (/invalid image data|image_url|unsupported image/i.test(message)) {
      throw new ApiError(400, "Invalid or unsupported image data for Groq. Please upload a valid JPG/PNG/WEBP, or a text-based PDF.");
    }
    
    if (status === 429 || /quota|limit|rate/i.test(message) || errorType === "rate_limit_error") {
      throw new ApiError(429, "API quota exceeded. Please try again later");
    }
    
    throw new ApiError(500, `AI extraction failed: ${message}`);
  }
}



/* =========================
   CLEAN JSON RESPONSE
========================= */
function parseAIJSON(content) {
  let cleanContent = String(content || "").trim();

  if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
  else if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
  if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);

  cleanContent = cleanContent.trim();

  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON object found in AI response");

  const rawJSON = jsonMatch[0]
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  return JSON.parse(rawJSON);
}

async function repairAIJSON(content) {
  const groq = getGroqClient();
  const candidateModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

  for (const model of candidateModels) {
    try {
      const response = await groq.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 2200,
        messages: [
          {
            role: "system",
            content:
              "You repair malformed JSON. Return only one valid JSON object. Use strict JSON with double-quoted keys and string values.",
          },
          {
            role: "user",
            content: `Fix this malformed JSON and return only valid JSON:\n\n${String(content || "")}`,
          },
        ],
      });

      const repairedText = String(response?.choices?.[0]?.message?.content || "").trim();
      if (!repairedText) continue;

      return parseAIJSON(repairedText);
    } catch {
      // try next model
    }
  }

  throw new ApiError(502, "AI returned malformed JSON and automatic repair failed");
}


/* =========================
   MAIN CONTROLLER
========================= */
/* =========================
   SERVICE FUNCTION (used internally)
========================= */
export default async function extractInvoice({ fileUrl, orgId, userId }) {
  if (!fileUrl) throw new ApiError(400, "fileUrl is required");

  // 1️⃣ Download from Supabase (same logic works)
  const { buffer, mime } = await downloadFile(fileUrl);
  const rawDocText = mime.includes("pdf") ? await extractTextFromPdf(buffer) : "";

  // 2️⃣ Send to Groq
  const aiContent = await callGroq({ buffer, mimeType: mime });

  // 3️⃣ Parse AI JSON
  let extractedData;
  try {
    extractedData = parseAIJSON(aiContent);
  } catch {
    extractedData = await repairAIJSON(aiContent);
  }

  const textHints = deriveInvoiceHintsFromText(rawDocText);
  extractedData = mergeWithTextHints(extractedData, textHints);

  const detectedCurrency = detectDocumentCurrency(rawDocText, extractedData);
  if (detectedCurrency && detectedCurrency !== "INR") {
    const fxRate = await getFxRate(detectedCurrency, "INR");
    if (fxRate) {
      extractedData = convertToInr(extractedData, fxRate, detectedCurrency);
    }
  }

  const validCategories = ['expense', 'revenue', 'asset', 'liability'];
  const documentCategory = validCategories.includes((extractedData.document_category || '').toLowerCase())
    ? extractedData.document_category.toLowerCase()
    : 'expense';

  const normalizedAccount = resolveSuggestedExpenseAccount({
    expenseAccount: extractedData.expense_account,
    expenseAccountGroup: extractedData.expense_account_group,
    documentCategory,
  });
  const normalizedTds = resolveSuggestedBillTds({
    tdsNature: extractedData.tds_nature,
    tdsReasoning: extractedData.tds_reasoning,
    expenseAccount: normalizedAccount.accountName,
    expenseAccountGroup: normalizedAccount.accountGroup,
    taxableAmount: extractedData.taxable_amount,
    totalAmount: extractedData.total_with_gst,
    vendorName: extractedData.vendor_name,
  });

  const invoice = {
    organization: orgId,
    uploadedBy: userId,

    document_category: documentCategory,
    invoice_number: sanitizeInvoiceNumber(extractedData.invoice_number) || 'UNKNOWN',
    date_of_issue: extractedData.date_of_issue || new Date().toISOString().split('T')[0],
    due_date: extractedData.due_date || null,
    vendor_name: sanitizeVendorName(extractedData.vendor_name) || 'Unknown Vendor',
    vendor_gstin: normalizeIndianGstin(extractedData.vendor_gstin) || null,
    vendor_city: extractedData.vendor_city || null,
    vendor_country: extractedData.vendor_country || null,
    vendor_gst_registration_status: extractedData.vendor_gst_registration_status || null,
    vendor_business_type: extractedData.vendor_business_type || null,
    customer_name: extractedData.customer_name || null,
    customer_city: extractedData.customer_city || null,
    place_of_supply: extractedData.place_of_supply || null,
    taxable_amount: Number(extractedData.taxable_amount) || 0,
    cgst: Number(extractedData.cgst) || 0,
    sgst: Number(extractedData.sgst) || 0,
    igst: Number(extractedData.igst) || 0,
    total_gst: Number(extractedData.total_gst) || 0,
    total_with_gst: Number(extractedData.total_with_gst) || 0,
    expense_account: normalizedAccount.accountName,
    expense_account_group: normalizedAccount.accountGroup,
    payment_mode: extractedData.payment_mode || null,
    is_tds_applicable: normalizedTds.isTdsApplicable,
    tds_amount: Number(extractedData.tds_amount) || 0,
    tds_nature: normalizedTds.tdsNature,
    tds_section: normalizedTds.tdsSection,
    tds_rate: normalizedTds.tdsRate,
    tds_tax_name: normalizedTds.tdsTaxName,
    tds_reasoning: normalizedTds.tdsReasoning,
    gst_reasoning: extractedData.gst_reasoning || null,
    confidence: Number(extractedData.confidence) || 50,
    source_file: fileUrl,
    currency: extractedData.currency || "INR",
    original_currency: extractedData.original_currency || null,
    exchange_rate: Number(extractedData.exchange_rate) || null,
  };

  return invoice;
}


















// export const extractInvoice = async (req, res) => {
//   try {
//     const { fileUrl, fileName } = req.body;

//     if (!fileUrl) throw new ApiError(400, "fileUrl is required");

//     // 1️⃣ Download from R2
//     const { buffer, mime } = await downloadFile(fileUrl);

//     // 2️⃣ Send to Claude
//     const aiContent = await callClaude(buffer, mime);

//     // 3️⃣ Parse AI JSON
//     const extractedData = parseAIJSON(aiContent);


//     /* =========================
//        NORMALIZATION (UNCHANGED)
//     ========================= */

//     const validCategories = ['expense', 'revenue', 'asset', 'liability'];
//     const documentCategory = validCategories.includes((extractedData.document_category || '').toLowerCase())
//       ? extractedData.document_category.toLowerCase()
//       : 'expense';

//     const normalizedAccount = resolveSuggestedExpenseAccount({
//       expenseAccount: extractedData.expense_account,
//       expenseAccountGroup: extractedData.expense_account_group,
//       documentCategory,
//     });

//     const invoice = {
//       document_category: documentCategory,
//       invoice_number: extractedData.invoice_number || 'UNKNOWN',
//       date_of_issue: extractedData.date_of_issue || new Date().toISOString().split('T')[0],
//       due_date: extractedData.due_date || null,
//       vendor_name: extractedData.vendor_name || 'Unknown Vendor',
//       vendor_gstin: extractedData.vendor_gstin || null,
//       vendor_city: extractedData.vendor_city || null,
//       vendor_gst_registration_status: extractedData.vendor_gst_registration_status || null,
//       vendor_business_type: extractedData.vendor_business_type || null,
//       customer_name: extractedData.customer_name || null,
//       customer_city: extractedData.customer_city || null,
//       place_of_supply: extractedData.place_of_supply || null,
//       taxable_amount: Number(extractedData.taxable_amount) || 0,
//       cgst: Number(extractedData.cgst) || 0,
//       sgst: Number(extractedData.sgst) || 0,
//       igst: Number(extractedData.igst) || 0,
//       total_gst: Number(extractedData.total_gst) || 0,
//       total_with_gst: Number(extractedData.total_with_gst) || 0,
//       expense_account: extractedData.expense_account || 'Miscellaneous',
//       payment_mode: extractedData.payment_mode || null,
//       gst_reasoning: extractedData.gst_reasoning || null,
//       confidence: Number(extractedData.confidence) || 50,
//     };

//     // FINAL RESPONSE (UNCHANGED)
//     return res.status(200).json({ success: true, invoice });

//   } catch (error) {
//     console.error("AI extraction error:", error.message);

//     return res.status(500).json({
//       success: false,
//       error: 'Document processing failed. Please try again.'
//     });
//   }
// };


/* 
Route
router.post(
  "/extract-invoice",
  protectRoute,
  orgMiddleware,
  extractInvoice
);

What you achieved now (important)

You now have a real ingestion pipeline:

Frontend → upload to R2 → send URL
Backend → fetch → validate → Claude → normalize → DB ready JSON

This is exactly how production accounting AI systems are built.

*/
