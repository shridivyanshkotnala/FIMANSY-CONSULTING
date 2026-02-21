// import { PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { r2 } from "../services/r2Client.js";
// import crypto from "crypto";

// const ALLOWED_TYPES = [
//   "application/pdf",
//   "image/png",
//   "image/jpeg",
//   "image/webp"
// ];

// export const getSignedUploadUrl = async (req, res) => {
//   try {
//     const { fileName, contentType } = req.body;

//     if (!fileName || !contentType)
//       return res.status(400).json({ message: "Invalid request" });

//     if (!ALLOWED_TYPES.includes(contentType))
//       return res.status(400).json({ message: "Unsupported file type" });

//     // sanitize filename
//     const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");

//     // unique key prevents overwrite & enables idempotency later
//     const uniqueId = crypto.randomUUID();

//     const key = `${req.organizationId}/raw/${uniqueId}-${safeName}`;

//     const command = new PutObjectCommand({
//       Bucket: process.env.R2_BUCKET,
//       Key: key,
//       ContentType: contentType,
//       Metadata: {
//         orgId: req.organizationId,
//         uploadedBy: req.user._id.toString(),
//       },
//     });

//     const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

//     const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

//     res.json({
//       uploadUrl,
//       fileUrl,
//       key,
//       expiresIn: 60
//     });

//   } catch (err) {
//     console.error("R2 signed url error:", err);
//     res.status(500).json({ message: "Upload initialization failed" });
//   }
// };


import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asynchandler} from "../utils/asynchandler.js";
import extractInvoice from "../Functions/invoice-extractor.js";

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

/**
 * Client already uploaded file to Supabase
 * Now we ingest + process it
 */
export const ingestUploadedInvoice = asynchandler(async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    throw new ApiError(400, "fileUrl is required");
  }

  // basic safety — prevent random internet file parsing abuse
  if (!fileUrl.includes("/storage/v1/object/public/invoices/")) {
    throw new ApiError(400, "Invalid storage source");
  }

  // extension validation (cheap protection before OCR cost)
  const lower = fileUrl.toLowerCase();
  const valid = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));

  if (!valid) {
    throw new ApiError(400, "Unsupported file format");
  }

  // optional: attach organization ownership
  const orgId = req.organizationId;
  const userId = req.user._id;

  // ---- START OCR PIPELINE ----
  const extractedData = await extractInvoice({
    fileUrl,
    orgId,
    userId
  });

  return res.status(200).json(
    { success: true, extractedData }
  );
});
