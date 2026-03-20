// TEMP TEST OVERRIDE: single source of time for FY rollover testing.
// Revert to real-time after verification.
const FORCED_TEST_DATE_ISO = "2026-08-12T00:00:00+05:30";

export function getCurrentSystemDate() {
  return new Date(FORCED_TEST_DATE_ISO);
}

export function normalizeFinancialYear(financialYear) {
  if (!financialYear) return null;

  const [startYearStr, endYearStr] = String(financialYear).split("-");
  const startYear = Number(startYearStr);

  if (!Number.isFinite(startYear)) return null;

  const rawEnd = String(endYearStr || "").trim();
  const normalizedEnd = rawEnd.length === 2 ? Number(`20${rawEnd}`) : Number(rawEnd);

  if (!Number.isFinite(normalizedEnd)) return null;

  return `${startYear}-${normalizedEnd}`;
}

export function getFinancialYearAliases(financialYear) {
  const normalized = normalizeFinancialYear(financialYear);
  if (!normalized) return [];

  const [startYearStr, endYearStr] = normalized.split("-");
  const endYearShort = String(endYearStr).slice(-2);

  return [normalized, `${startYearStr}-${endYearShort}`];
}

export function getCurrentFinancialYear(referenceDate = getCurrentSystemDate()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}