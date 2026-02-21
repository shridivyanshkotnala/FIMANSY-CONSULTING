import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/ApiError.js";

/* =========================
   GEMINI INIT
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


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
   CALL GEMINI
========================= */
async function callGemini(buffer, mimeType) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new ApiError(500, "GEMINI_API_KEY is not configured");
    }
/*
 */   // Use gemini-2.5-flash for PDF/image processing (latest model with available quota)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    });

    const base64 = buffer.toString("base64");

   const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64
      }
    };

    const result = await model.generateContent([extractionPrompt, imagePart]);

    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Empty AI response");

    return text;
    
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    console.error("Full error:", error);
    
    if (error.message?.includes("API key") || error.message?.includes("API_KEY")) {
      throw new ApiError(500, "Invalid or missing Gemini API key. Please check your .env file");
    }
    
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      throw new ApiError(500, "Gemini model not available. Try using gemini-pro-vision or gemini-1.5-pro");
    }
    
    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      throw new ApiError(429, "API quota exceeded. Please try again later");
    }
    
    throw new ApiError(500, `AI extraction failed: ${error.message}`);
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

  // 2️⃣ Send to Gemini
  const aiContent = await callGemini(buffer, mime);

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

//     // 2️⃣ Send to Gemini
//     const aiContent = await callGemini(buffer, mime);

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
Backend → fetch → validate → Gemini → normalize → DB ready JSON

This is exactly how production accounting AI systems are built.

*/