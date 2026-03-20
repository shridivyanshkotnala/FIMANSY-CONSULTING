import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "../utils/ApiError.js";

/* =========================
   CLAUDE INIT
========================= */
const getAnthropicClient = () => {
  const key = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    throw new ApiError(500, "ANTHROPIC_API_KEY is not configured");
  }

  return new Anthropic({ apiKey: key });
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
6. vendor_gstin: Vendor's GST Identification Number (15 characters)
7. vendor_city: Vendor's city/location
8. vendor_gst_registration_status: "registered", "unregistered", or "composition"
9. vendor_business_type: "B2B" or "B2C"
10. customer_name: Name of the buyer/customer
11. customer_city: Customer's city/location
12. place_of_supply: State where goods/services are supplied
13. taxable_amount: Total amount before GST (number)
14. cgst: Central GST amount (number, 0 if inter-state)
15. sgst: State GST amount (number, 0 if inter-state)
16. igst: Integrated GST amount (number, 0 if intra-state)
17. total_gst: Sum of all GST components (number)
18. total_with_gst: Final invoice amount including GST (number)
19. expense_account: Suggested category
20. payment_mode: "Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"
21. gst_reasoning: Explain the GST treatment
22. confidence: Your confidence score from 0 to 100

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

    const contentType = response.headers["content-type"] || "";

    if (!contentType.includes("pdf") && !contentType.includes("image")) {
      throw new ApiError(400, "Unsupported file type");
    }

    return {
      buffer: Buffer.from(response.data),
      mime: contentType.includes("pdf") ? "application/pdf" : contentType
    };

  } catch {
    throw new ApiError(400, "Unable to download document");
  }
}


/* =========================
   CALL CLAUDE
========================= */
async function callClaude(buffer, mimeType) {
  try {
    const base64 = buffer.toString("base64");

    const anthropic = getAnthropicClient();
    const candidateModels = ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"];
    let lastModelError = null;

    for (const candidateModel of candidateModels) {
      try {
        const filePart = mimeType.includes("pdf")
          ? {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            }
          : {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64,
              },
            };

        const response = await anthropic.messages.create({
          model: candidateModel,
          max_tokens: 2048,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: extractionPrompt },
                filePart,
              ],
            },
          ],
        });

        const text = (response.content || [])
          .filter((part) => part?.type === "text")
          .map((part) => part?.text || "")
          .join("\n")
          .trim();

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

    throw lastModelError || new Error("No compatible Claude model available");
    
  } catch (error) {
    const message = String(error?.message || "");
    const status = error?.status || error?.statusCode;
    const errorType = String(error?.error?.type || "").toLowerCase();

    console.error("❌ Claude API Error:", message);

    if (
      status === 401 ||
      /API key|ANTHROPIC_API_KEY|authentication|unauthorized|permission denied/i.test(message) ||
      errorType === "authentication_error"
    ) {
      throw new ApiError(500, "Invalid or missing Anthropic API key. Please check ANTHROPIC_API_KEY in your .env file");
    }
    
    if (status === 404 || /404|not found/i.test(message)) {
      throw new ApiError(500, "Claude model not available for this API key. Try another Claude model.");
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
  let cleanContent = content.trim();

  if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
  else if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
  if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);

  cleanContent = cleanContent.trim();

  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON found");

  return JSON.parse(jsonMatch[0]);
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

  // 2️⃣ Send to Claude
  const aiContent = await callClaude(buffer, mime);

  // 3️⃣ Parse AI JSON
  const extractedData = parseAIJSON(aiContent);

  const validCategories = ['expense', 'revenue', 'asset', 'liability'];
  const documentCategory = validCategories.includes((extractedData.document_category || '').toLowerCase())
    ? extractedData.document_category.toLowerCase()
    : 'expense';

  const invoice = {
    organization: orgId,
    uploadedBy: userId,

    document_category: documentCategory,
    invoice_number: extractedData.invoice_number || 'UNKNOWN',
    date_of_issue: extractedData.date_of_issue || new Date().toISOString().split('T')[0],
    due_date: extractedData.due_date || null,
    vendor_name: extractedData.vendor_name || 'Unknown Vendor',
    vendor_gstin: extractedData.vendor_gstin || null,
    vendor_city: extractedData.vendor_city || null,
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
    expense_account: extractedData.expense_account || 'Miscellaneous',
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