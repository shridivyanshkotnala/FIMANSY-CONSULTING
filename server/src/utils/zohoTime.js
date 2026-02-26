export function toZohoTime(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) throw new Error(`Invalid date string passed to toZohoTime: ${dateString}`);
  // Zoho Books expects ISO 8601 with timezone and no milliseconds, e.g. 2026-02-22T10:21:39Z
  return d.toISOString().split(".")[0] + "Z";
}