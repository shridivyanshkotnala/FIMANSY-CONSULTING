import "../../loadEnv.js";
import connectDB from "../db/index.js";
import mongoose from "mongoose";
import { ComplianceComment } from "../models/compliance/complianceCommentModel.js";
import { ComplianceTicket } from "../models/compliance/complianceTicketModel.js";
import { ComplianceDocument } from "../models/compliance/complianceDocumentModel.js";

const guessContentType = (name = "") => {
  const n = String(name).toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (n.endsWith(".xls")) return "application/vnd.ms-excel";
  if (n.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
};

const keyFromUrl = (url = "") => {
  const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (publicBase && String(url).startsWith(publicBase + "/")) {
    return String(url).slice(publicBase.length + 1);
  }
  return null;
};

const run = async () => {
  await connectDB();
  console.log("DB connected. Starting backfill...");

  const comments = await ComplianceComment.find({
    attachments: { $exists: true, $ne: [] },
  })
    .select("ticket_id organization_id user_id role attachments createdAt")
    .lean();

  let created = 0;
  let skipped = 0;

  for (const c of comments) {
    const ticket = await ComplianceTicket.findById(c.ticket_id)
      .select("_id organization_id obligation_id financial_year due_date subtag compliance_subtype")
      .lean();

    if (!ticket) {
      skipped += 1;
      continue;
    }

    for (const a of c.attachments || []) {
      const name = a?.name || a?.file_name || "document";
      const url = a?.url || a?.file_url;
      const key = a?.key || keyFromUrl(url || "");

      if (!url || !key) {
        skipped += 1;
        continue;
      }

      const exists = await ComplianceDocument.findOne({ key }).select("_id").lean();
      if (exists) {
        skipped += 1;
        continue;
      }

      const count = await ComplianceDocument.countDocuments({ ticket_id: ticket._id });

      const doc = {
        ticket_id: ticket._id,
        organization_id: ticket.organization_id,
        obligation_id: ticket.obligation_id || null,
        uploaded_by: c.user_id,
        uploaded_by_role: c.role === "user" ? "user" : "accountant",
        original_file_name: name,
        display_file_name: name,
        stored_file_name: name,
        document_kind: a?.is_final_verified ? "final_verified_return" : "working_doc",
        is_final_verified: !!a?.is_final_verified,
        final_verified_at: a?.is_final_verified ? c.createdAt : null,
        final_verified_by: a?.is_final_verified ? c.user_id : null,
        final_verified_comment_id: a?.is_final_verified ? c._id : null,
        financial_year: ticket.financial_year || "FY-unknown",
        compliance_obligation_name: ticket.subtag || ticket.compliance_subtype || "compliance-document",
        due_date: ticket.due_date || new Date(),
        bucket: process.env.R2_BUCKET,
        key,
        url,
        content_type: a?.content_type || guessContentType(name),
        file_size: Number(a?.file_size || 0),
        version_no: count + 1,
        exchange_round: count + 1,
        is_active: true,
        createdAt: c.createdAt,
        updatedAt: c.createdAt,
      };

      const inserted = await ComplianceDocument.create(doc);
      created += 1;

      if (inserted.is_final_verified) {
        await ComplianceTicket.updateOne(
          { _id: ticket._id },
          {
            $set: {
              final_verified_document_id: inserted._id,
              final_verified_at: inserted.final_verified_at || new Date(),
              final_verified_by: inserted.final_verified_by || c.user_id,
            },
          }
        );
      }
    }
  }

  console.log(`Backfill complete. created=${created}, skipped=${skipped}`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Backfill failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
