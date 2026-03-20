import { pushInvoiceToZoho } from "../services/zohoInvoiceService.js";
import { pushExpenseToZoho } from "../services/zohoExpenseService.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "../services/r2Client.js";
import { asynchandler } from "../utils/asynchandler.js";
// export const syncInvoiceToZoho = async (req, res) => {

//   const invoice = req.body; // later from DB

//   const result = await pushInvoiceToZoho(req.zohoClient, invoice);

//   res.json({
//     message: "Invoice pushed to Zoho",
//     zohoInvoiceId: result.invoice.invoice_id,
//   });
// };

export const syncInvoiceToZoho = asynchandler(async (req, res) => {

  const invoice = req.body.invoice;
  if (!invoice) {
    return res.status(400).json({ success: false, message: "invoice payload is required" });
  }

  let result;
  if ((invoice.document_category || "").toLowerCase() === "expense") {
    result = await pushExpenseToZoho(req.zoho, invoice);
  } else {
    result = await pushInvoiceToZoho(req.zoho, invoice);
  }

  const sourceFileUrl = invoice.source_file || invoice.pdf_url || null;
  const deletedSourceFile = await deleteR2FileIfPresent(sourceFileUrl);

  res.json({
    success: true,
    zohoInvoiceId: result.invoice_id || result.expense?.expense_id || result.expense_id,
    deletedSourceFile,
  });
});

const deleteR2FileIfPresent = async (fileUrl) => {
  if (!fileUrl) return false;

  try {
    const r2PublicRaw = String(process.env.R2_PUBLIC_URL || "").trim();
    if (!r2PublicRaw) return false;
    const r2Public = /^https?:\/\//i.test(r2PublicRaw) ? r2PublicRaw : `https://${r2PublicRaw}`;

    if (!String(fileUrl).startsWith(r2Public)) {
      return false;
    }

    const parsedUrl = new URL(fileUrl);
    const key = parsedUrl.pathname.replace(/^\/+/, "");
    if (!key) return false;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: String(process.env.R2_BUCKET || "fimansy-documents").trim(),
        Key: decodeURIComponent(key),
      })
    );

    return true;
  } catch (error) {
    console.warn("Failed to delete source file from R2:", error?.message || error);
    return false;
  }
};












/*

{
  "customer_id": "9823749234",
  "date": "2025-11-26",
  "invoice_number": "7EB040A0-0013",
  "place_of_supply": "KA",
  "gst_treatment": "business_gst",
  "line_items": [
    {
      "name": "Software Subscription",
      "rate": 25.05,
      "quantity": 1,
      "tax_id": "igstrcm_18"
    }
  ]
}

*/
