import mongoose from "mongoose";
import { ComplianceDocument } from "../../models/compliance/complianceDocumentModel.js";

export const getFinalVerifiedDocumentsReport = async (req, res) => {
  try {
    const {
      organization_id,
      financial_year,
      compliance_name,
      from_due_date,
      to_due_date,
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const match = {
      is_active: true,
      is_final_verified: true,
    };

    if (organization_id) {
      if (!mongoose.Types.ObjectId.isValid(organization_id)) {
        return res.status(400).json({ message: "Invalid organization_id" });
      }
      match.organization_id = new mongoose.Types.ObjectId(organization_id);
    }

    if (financial_year) {
      match.financial_year = String(financial_year).trim();
    }

    if (compliance_name) {
      match.compliance_obligation_name = {
        $regex: String(compliance_name).trim(),
        $options: "i",
      };
    }

    if (from_due_date || to_due_date) {
      match.due_date = {};
      if (from_due_date) match.due_date.$gte = new Date(from_due_date);
      if (to_due_date) match.due_date.$lte = new Date(to_due_date);
    }

    const [rows, total] = await Promise.all([
      ComplianceDocument.find(match)
        .sort({ due_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate("organization_id", "name")
        .populate("ticket_id", "ticket_number category_tag subtag due_date financial_year")
        .populate("final_verified_by", "name email")
        .lean(),
      ComplianceDocument.countDocuments(match),
    ]);

    return res.status(200).json({
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      total,
      data: rows,
    });
  } catch (error) {
    console.error("getFinalVerifiedDocumentsReport error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
