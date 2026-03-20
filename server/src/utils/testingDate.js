// TEMP TEST OVERRIDE
// This is intentionally hardcoded for FY rollover testing.
// Revert this file usage after testing is complete.
const FORCED_TEST_DATE_ISO = "2026-04-01T00:00:00+05:30";

export function getTestingAwareNow() {
  return new Date(FORCED_TEST_DATE_ISO);
}
