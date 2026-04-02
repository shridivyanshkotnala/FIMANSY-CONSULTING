import axios from "axios";
import Groq from "groq-sdk";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  buildExpenseAccountPromptText,
  resolveSuggestedExpenseAccount,
} from "../utils/zohoExpenseAccountCatalog.js";
import { normalizeIndianGstin } from "../utils/zohoGstState.js";

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
14. taxable_amount: Total amount before GST (number)
15. cgst: Central GST amount (number, 0 if inter-state)
16. sgst: State GST amount (number, 0 if inter-state)
17. igst: Integrated GST amount (number, 0 if intra-state)
18. total_gst: Sum of all GST components (number)
19. total_with_gst: Final invoice amount including GST (number)
20. expense_account: Exact Zoho account name for the bill
21. expense_account_group: "expense" or "cost_of_goods_sold"
22. payment_mode: "Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"
23. gst_reasoning: Explain the GST treatment
24. confidence: Your confidence score from 0 to 100

Vendor tax rules:
- vendor_gstin must only contain the seller/vendor's Indian 15-character GSTIN.
- Never copy the purchaser/customer GST or customer tax ID into vendor_gstin.
- If the vendor is outside India or the document shows a foreign registration number like UEN, VAT ID, or TAX ID, set vendor_gstin to null and fill vendor_country.

${buildExpenseAccountPromptText()}

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
    const text = String(parsed?.text || "").replace(/\s+/g, " ").trim();
    return text;
  } catch {
    return "";
  }
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
          "meta-llama/llama-4-scout-17b-16e-instruct",
          "meta-llama/llama-4-maverick-17b-128e-instruct"
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

  // 2️⃣ Send to Groq
  const aiContent = await callGroq({ buffer, mimeType: mime });

  // 3️⃣ Parse AI JSON
  let extractedData;
  try {
    extractedData = parseAIJSON(aiContent);
  } catch {
    extractedData = await repairAIJSON(aiContent);
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

  const invoice = {
    organization: orgId,
    uploadedBy: userId,

    document_category: documentCategory,
    invoice_number: extractedData.invoice_number || 'UNKNOWN',
    date_of_issue: extractedData.date_of_issue || new Date().toISOString().split('T')[0],
    due_date: extractedData.due_date || null,
    vendor_name: extractedData.vendor_name || 'Unknown Vendor',
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
    gst_reasoning: extractedData.gst_reasoning || null,
    confidence: Number(extractedData.confidence) || 50,
    source_file: fileUrl
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
