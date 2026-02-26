// controllers/cashIntelligenceController.js

import { DSOMonthlyMetric } from "../models/ledger/dsoMonthlyMetricModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { runDSOMetricsWorker } from "../workers/dsoMetricsWorker.js";

export const getDSOData = async (req, res) => {
  const organizationId = req.organizationId;

  let months = await DSOMonthlyMetric
    .find({ organizationId })
    .sort({ year: -1, monthNumber: -1 })
    .limit(6)
    .lean();

  // If no pre-generated metrics exist yet, try to generate them on-demand
  if (!months.length) {
    try {
      const connection = await ZohoConnection.findOne({ organizationId }).lean();
      if (connection) {
        // call worker directly with a lightweight job object
        await runDSOMetricsWorker({ connectionId: connection._id });

        // re-query after generation
        months = await DSOMonthlyMetric
          .find({ organizationId })
          .sort({ year: -1, monthNumber: -1 })
          .limit(6)
          .lean();
      }
    } catch (err) {
      console.error("DSO generation failed:", err);
    }
  }

  if (!months.length) {
    return res.json({ months: [], metrics: null });
  }

  const sortedAsc = [...months].reverse();

  const current = months[0];

  res.json({
    months: sortedAsc.map((m) => ({
      month: m.month,
      dso: Number(m.dso.toFixed(2)),
    })),
    metrics: {
      currentDSO: Number(current.dso.toFixed(2)),
      previousDSO: current.previousDso || 0,
      trend: current.trend,
      atRiskRevenue: current.atRiskRevenue,
      inflationCost: current.inflationCost,
      interestCost: current.interestCost,
    },
  });
};