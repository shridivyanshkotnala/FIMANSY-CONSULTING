import mongoose from "mongoose";
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";

// ==============================
// GENERATE FINANCIAL YEAR
// ==============================
export const generateFY = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.body;

    if (!organization_id || !financialYear) {
      return res.status(400).json({
        success: false,
        message: "organization_id and financialYear are required",
      });
    }

    const existing = await ComplianceObligation.countDocuments({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      financial_year: financialYear,
    });

    if (existing > 0) {
      return res.status(409).json({
        success: false,
        message: "Obligations already generated for this FY",
      });
    }

    const count = await generateObligationsForFY(organization_id, financialYear);

    res.status(201).json({
      success: true,
      message: `${count} obligations generated`,
      count,
    });
  } catch (error) {
    console.error("❌ Error in generateFY:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// GET OBLIGATIONS
// ==============================
export const getObligations = async (req, res) => {
  try {
    const { organization_id, status, financialYear, type } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required",
      });
    }

    // Build filter
    const filter = { organization_id: new mongoose.Types.ObjectId(organization_id) };

    if (status) filter.status = status;
    if (financialYear) filter.financial_year = financialYear;
    if (type) filter.compliance_type = type;

    console.log("🔍 Obligations filter:", JSON.stringify(filter, null, 2));

    const obligations = await ComplianceObligation.find(filter)
      .sort({ due_date: 1 })
      .lean();

    console.log(`📊 Found ${obligations.length} obligations`);

    res.json({
      success: true,
      data: obligations,
    });
  } catch (error) {
    console.error("❌ Error in getObligations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// UPDATE OBLIGATION STATUS
// ==============================
export const updateObligationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await ComplianceObligation.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        completed_at: status === "filed" ? new Date() : null,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Obligation not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error in updateObligationStatus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// DELETE OBLIGATION
// ==============================
export const deleteObligation = async (req, res) => {
  try {
    const { id } = req.params;

    await ComplianceObligation.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Obligation deleted",
    });
  } catch (error) {
    console.error("❌ Error in deleteObligation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// DASHBOARD SUMMARY
// ==============================
export const getDashboardSummary = async (req, res) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required",
      });
    }

    const today = new Date();

    const overdue = await ComplianceObligation.countDocuments({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      status: { $ne: "filed" },
      due_date: { $lt: today },
    });

    const upcoming = await ComplianceObligation.countDocuments({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      status: { $ne: "filed" },
      due_date: { $gte: today },
    });

    res.json({
      success: true,
      data: { overdue, upcoming },
    });
  } catch (error) {
    console.error("❌ Error in getDashboardSummary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};