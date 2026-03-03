import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";

/**
 * @desc    Generate obligations for a company for a financial year
 * @route   POST /api/compliance/organization/:organization_id/generate-fy
 */
export const generateFY = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const { financialYear } = req.body; // e.g., "2025-26"

    if (!financialYear) {
      return res.status(400).json({
        success: false,
        message: "financialYear is required (e.g., '2025-26')"
      });
    }

    // Check if obligations already exist for this FY
    const existingCount = await ComplianceObligation.countDocuments({
      organization_id,
      financial_year: financialYear
    });

    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Obligations for FY ${financialYear} already exist. Delete them first if you want to regenerate.`,
        count: existingCount
      });
    }

    // Generate new obligations
    const generatedCount = await generateObligationsForFY(organization_id, financialYear);

    res.status(201).json({
      success: true,
      message: `Successfully generated ${generatedCount} compliance obligations for FY ${financialYear}`,
      count: generatedCount,
      financialYear
    });

  } catch (error) {
    console.error("Error generating FY obligations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate obligations"
    });
  }
};

/**
 * @desc    Get calendar obligations for a company with filters
 * @route   GET /api/compliance/organization/:organization_id/calendar
 */
export const getCalendarObligations = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const { 
      startDate, 
      endDate, 
      status, 
      category_tag, // using category_tag to match template naming
      month, 
      year,
      financialYear 
    } = req.query;

    // Build filter object
    const filter = { organization_id };

    // Date range filter
    if (startDate && endDate) {
      filter.due_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      // Filter by specific month/year
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      filter.due_date = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Category filter
    if (category_tag) {
      filter.category_tag = category_tag;
    }

    // Financial year filter
    if (financialYear) {
      filter.financial_year = financialYear;
    }

    // Get obligations sorted by due date
    const obligations = await ComplianceObligation.find(filter)
      .sort({ due_date: 1 })
      .lean(); // Use lean() for better performance

    // Also get counts for dashboard stats
    const stats = {
      total: obligations.length,
      byStatus: await ComplianceObligation.aggregate([
        { $match: { organization_id } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      overdue: await ComplianceObligation.countDocuments({
        organization_id,
        status: { $ne: "filed" },
        due_date: { $lt: new Date() }
      })
    };

    res.json({
      success: true,
      data: obligations,
      stats,
      filters: req.query
    });

  } catch (error) {
    console.error("Error fetching calendar obligations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch calendar obligations"
    });
  }
};

/**
 * @desc    Update obligation status (mark as filed, in progress, etc.)
 * @route   PATCH /api/compliance/obligation/:obligation_id
 */
export const updateObligationStatus = async (req, res) => {
  try {
    const { obligation_id } = req.params;
    const { status, filing_date, srn_number, acknowledgement_number, notes } = req.body;

    const updateData = { status };
    
    if (status === "filed") {
      updateData.filing_date = filing_date || new Date();
      updateData.completed_at = new Date();
    }
    
    if (srn_number) updateData.srn_number = srn_number;
    if (acknowledgement_number) updateData.acknowledgement_number = acknowledgement_number;
    if (notes) updateData.notes = notes;

    const updated = await ComplianceObligation.findByIdAndUpdate(
      obligation_id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Obligation not found"
      });
    }

    res.json({
      success: true,
      data: updated,
      message: `Obligation marked as ${status}`
    });

  } catch (error) {
    console.error("Error updating obligation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update obligation"
    });
  }
};

/**
 * @desc    Delete obligations for a financial year (to allow regeneration)
 * @route   DELETE /api/compliance/organization/:organization_id/fy/:financialYear
 */
export const deleteFYObligations = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.params;

    const result = await ComplianceObligation.deleteMany({
      organization_id,
      financial_year: financialYear
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} obligations for FY ${financialYear}`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("Error deleting FY obligations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete obligations"
    });
  }
};

/**
 * @desc    Get dashboard summary with upcoming deadlines
 * @route   GET /api/compliance/organization/:organization_id/dashboard-summary
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    // Get upcoming deadlines
    const upcomingDeadlines = await ComplianceObligation.find({
      organization_id,
      status: { $ne: "filed" },
      due_date: { $gte: today, $lte: nextMonth }
    })
    .sort({ due_date: 1 })
    .limit(10)
    .lean();

    // Get overdue items
    const overdue = await ComplianceObligation.find({
      organization_id,
      status: { $ne: "filed" },
      due_date: { $lt: today }
    })
    .sort({ due_date: 1 })
    .limit(10)
    .lean();

    // Get counts by category
    const byCategory = await ComplianceObligation.aggregate([
      { $match: { organization_id } },
      { $group: { 
        _id: "$category_tag", 
        total: { $sum: 1 },
        filed: { $sum: { $cond: [{ $eq: ["$status", "filed"] }, 1, 0] } },
        overdue: { $sum: { $cond: [
          { $and: [
            { $ne: ["$status", "filed"] },
            { $lt: ["$due_date", today] }
          ]}, 1, 0
        ]}}
      }}
    ]);

    res.json({
      success: true,
      data: {
        upcomingDeadlines,
        overdue,
        byCategory,
        summary: {
          totalUpcomingThisMonth: upcomingDeadlines.length,
          totalOverdue: overdue.length,
          nextDeadline: upcomingDeadlines[0] || null
        }
      }
    });

  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary"
    });
  }
};