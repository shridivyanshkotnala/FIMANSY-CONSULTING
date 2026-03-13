// controllers/accountant.controller.js
import { fetchDashboardMetrics } from "../../services/accountant/accountantService.js";
import { fetchOrganizationsSummary } from "../../services/accountant/accountantService.js";

export const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await fetchDashboardMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    return res.status(500).json({ message: "Failed to fetch metrics" });
  }
};
/*
{
  "overdue_count": 4,
  "pending_docs_count": 3,
  "in_progress_count": 6,
  "filed_count": 12,
  "closed_count": 18,
  "avg_resolution_days": 3.2,
  "on_time_percentage": 82
}

*/

// controllers/accountant.controller.js

export const getOrganizationsSummary = async (req, res) => {
  try {
    const result = await fetchOrganizationsSummary(req.query);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Organizations Summary Error:", err);
    return res.status(500).json({ message: "Failed to fetch organizations" });
  }
};