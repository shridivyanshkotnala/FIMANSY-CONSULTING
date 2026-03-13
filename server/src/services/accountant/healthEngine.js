
const CATEGORY_WEIGHTS = {
  gst: 1.2,
  tds: 1.5,
  income_tax: 1.8,
  mca: 2.0,
  payroll: 1.0,
  other: 1.0,
};

const DAY_MS = 1000 * 60 * 60 * 24;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateOrganizationHealth(tickets) {
  const today = new Date();

  let overduePenalty = 0;
  let pendingPenalty = 0;
  let overdueCount = 0;
  let totalActive = 0;

  tickets.forEach((ticket) => {
    const weight = CATEGORY_WEIGHTS[ticket.category_tag] || 1;

    const isActive = [
      "not_started",
      "initiated",
      "pending_docs",
      "in_progress",
      "overdue",
    ].includes(ticket.status);

    if (isActive) totalActive++;

    // -------------------------
    // OVERDUE PENALTY
    // -------------------------
    if (ticket.status === "overdue") {
      overdueCount++;

      const daysOverdue = Math.floor(
        (today - new Date(ticket.due_date)) / DAY_MS
      );

      const cappedDays = Math.min(30, Math.max(0, daysOverdue));

      overduePenalty += cappedDays * weight;
    }

    // -------------------------
    // PENDING DOCS PENALTY
    // -------------------------
    if (ticket.status === "pending_docs") {
      const updatedMs = ticket.updatedAt ? new Date(ticket.updatedAt).getTime() : Date.now();
      const daysPending = Math.floor(
        (today.getTime() - updatedMs) / DAY_MS
      );

      // Cap at 30 days to avoid runaway penalty from old/seed data
      const effectiveDays = Math.min(30, Math.max(0, daysPending - 3));

      pendingPenalty += effectiveDays * 0.5;
    }
  });

  // -------------------------
  // RATIO PENALTY
  // -------------------------
  // Reduced from 40 → 20: a single overdue ticket no longer instantly causes Critical
  const ratioPenalty =
    (overdueCount / Math.max(1, totalActive)) * 20;

  const totalPenalty =
    overduePenalty + pendingPenalty + ratioPenalty;

  const healthScore = clamp(100 - totalPenalty, 0, 100);

  // Wider bands for proper distribution across all three levels
  const healthStatus =
    healthScore >= 75
      ? "healthy"
      : healthScore >= 45
      ? "attention"
      : "critical";

  return {
    health_score: Number(healthScore.toFixed(2)),
    health_status: healthStatus,
    breakdown: {
      overdue_penalty: Number(overduePenalty.toFixed(2)),
      pending_penalty: Number(pendingPenalty.toFixed(2)),
      ratio_penalty: Number(ratioPenalty.toFixed(2)),
      total_penalty: Number(totalPenalty.toFixed(2)),
    },
  };
}