import dayjs from "dayjs";
import { ARLedger } from "../models/ledger/arLedgerModel.js";
import { DSOMonthlyMetric } from "../models/ledger/dsoMonthlyMetricModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { rebuildARLedger } from "../services/ledger/rebuildArLedger.js";

export const runDSOMetricsWorker = async (job) => {

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Connection not found for DSO metrics job");

  const organizationId = connection.organizationId;

  // Always rebuild AR ledger first so DSO metrics reflect latest sync data
  await rebuildARLedger(organizationId, connection._id);

  const now = dayjs();
  const monthsToGenerate = 6;

  for (let i = 0; i < monthsToGenerate; i++) {

    const monthStart = now.subtract(i, "month").startOf("month");
    const monthEnd = now.subtract(i, "month").endOf("month");

    const monthKey = monthStart.format("YYYY-MM");

    const daysInMonth = monthStart.daysInMonth();

    // 1️⃣ Ending AR (balance at month end)
    const endingAR = await ARLedger.aggregate([
      {
        $match: {
          organizationId,
          invoiceDate: { $lte: monthEnd.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$currentBalance" }
        }
      }
    ]);

    const endingAccountsReceivable = endingAR[0]?.total || 0;

    // 2️⃣ Credit Sales during month
    const sales = await ARLedger.aggregate([
      {
        $match: {
          organizationId,
          invoiceDate: {
            $gte: monthStart.toDate(),
            $lte: monthEnd.toDate()
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$originalAmount" }
        }
      }
    ]);

    const creditSales = sales[0]?.total || 0;

    // Avoid division by zero
    const dso =
      creditSales === 0
        ? 0
        : (endingAccountsReceivable / creditSales) * daysInMonth;

    // 3️⃣ Aging buckets
    const aging = await ARLedger.aggregate([
      {
        $match: {
          organizationId,
          currentBalance: { $gt: 0 }
        }
      },
      {
        $project: {
          currentBalance: 1,
          daysOutstanding: {
            $divide: [
              { $subtract: [new Date(), "$dueDate"] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          bucket_0_30: {
            $sum: {
              $cond: [{ $lte: ["$daysOutstanding", 30] }, "$currentBalance", 0]
            }
          },
          bucket_31_60: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$daysOutstanding", 30] },
                    { $lte: ["$daysOutstanding", 60] }
                  ]
                },
                "$currentBalance",
                0
              ]
            }
          },
          bucket_61_90: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$daysOutstanding", 60] },
                    { $lte: ["$daysOutstanding", 90] }
                  ]
                },
                "$currentBalance",
                0
              ]
            }
          },
          bucket_90_plus: {
            $sum: {
              $cond: [{ $gt: ["$daysOutstanding", 90] }, "$currentBalance", 0]
            }
          }
        }
      }
    ]);

    const buckets = aging[0] || {};

    const atRiskRevenue =
      (buckets.bucket_61_90 || 0) +
      (buckets.bucket_90_plus || 0);

    // 4️⃣ Economic Impact
    const inflationRate = 0.06;
    const financingRate = 0.12;

    const avgDelayDays = dso;

    const inflationCost =
      atRiskRevenue * (inflationRate / 365) * avgDelayDays;

    const interestCost =
      atRiskRevenue * (financingRate / 365) * avgDelayDays;

    // 5️⃣ Previous DSO
    const previous = await DSOMonthlyMetric.findOne({
      organizationId,
      month: now.subtract(i + 1, "month").format("YYYY-MM")
    });

    let trend = "flat";
    if (previous) {
      if (dso > previous.dso) trend = "up";
      if (dso < previous.dso) trend = "down";
    }

    await DSOMonthlyMetric.findOneAndUpdate(
      { organizationId, month: monthKey },
      {
        organizationId,
        month: monthKey,
        year: monthStart.year(),
        monthNumber: monthStart.month() + 1,
        endingAccountsReceivable,
        creditSales,
        daysInPeriod: daysInMonth,
        dso,
        previousDso: previous?.dso || 0,
        trend,
        atRiskRevenue,
        agingBuckets: buckets,
        inflationCost,
        interestCost,
        generatedAt: new Date()
      },
      { upsert: true }
    );

    console.log(`[DSO] Generated for ${monthKey}`);
  }
};