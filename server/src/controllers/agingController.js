import { getAgingInvoices } from "../services/aging/agingService.js";
import { getAgingSummary } from "../services/aging/agingQueryService.js";

export const fetchAgingAlerts = async (req, res) => {

  const organizationId = req.organizationId;

  const includeAll = req.query.all === "1" || req.query.all === "true";
  const data = await getAgingInvoices(organizationId, includeAll);

  res.json({
    success: true,
    data
  });
};


export const fetchAgingDashboard = async (req, res) => {
  const data = await getAgingSummary(req.organizationId);

  res.json({
    success: true,
    data
  });
};

