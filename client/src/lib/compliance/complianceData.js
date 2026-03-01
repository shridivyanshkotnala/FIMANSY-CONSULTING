/**
 * Compliance Data — Static Schedules & Rules
 * -------------------------------------------
 * Contains:
 * - FIXED_SCHEDULE_COMPLIANCES: recurring GST/TDS/IT filings
 * - CONDITIONAL_COMPLIANCES: filings that apply only if conditions are met
 * - TAG_COLORS: visual badge styling per compliance category
 *
 * This file is PURELY STATIC DATA — no API calls, no Supabase, no Redux.
 * Business logic only.
 */


/* ============================================================
   TAG COLORS (badge styles per category)
============================================================ */

export const TAG_COLORS = {
  GST: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  TDS: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  "Income Tax": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  MCA: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  Payroll: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
  Other: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300",
};


/* ============================================================
   FIXED SCHEDULE COMPLIANCES
   These are monthly/quarterly filings with deterministic due dates.

   getDueDate(month, year) → Date | null
     month = 0-indexed JS month (0 = Jan, 11 = Dec)
     returns the due date if this filing applies in that month, else null
============================================================ */

export const FIXED_SCHEDULE_COMPLIANCES = [
  // ---------- GST ----------
  {
    name: "GSTR-1",
    description: "Monthly return of outward supplies",
    primaryTag: "GST",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => new Date(year, month + 1, 11),
    // Due 11th of next month
  },
  {
    name: "GSTR-3B",
    description: "Monthly summary return & tax payment",
    primaryTag: "GST",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => new Date(year, month + 1, 20),
    // Due 20th of next month
  },
  {
    name: "GSTR-1 (QRMP)",
    description: "Quarterly return under QRMP scheme",
    primaryTag: "GST",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => {
      // Quarterly: due in months following quarter end (Jan, Apr, Jul, Oct)
      // Quarter-end months: 2 (Mar), 5 (Jun), 8 (Sep), 11 (Dec)
      if (month === 2 || month === 5 || month === 8 || month === 11) {
        return new Date(year, month + 1, 13);
      }
      return null;
    },
  },
  {
    name: "IFF (Invoice Furnishing Facility)",
    description: "Optional invoice upload for QRMP taxpayers",
    primaryTag: "GST",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => {
      // Not applicable for quarter-end months
      if (month === 2 || month === 5 || month === 8 || month === 11) return null;
      return new Date(year, month + 1, 13);
    },
  },
  {
    name: "GSTR-9",
    description: "Annual GST return",
    primaryTag: "GST",
    secondaryTag: "Annual",
    getDueDate: (month, year) => {
      // Due 31st Dec of next FY — only trigger in December
      if (month === 11) return new Date(year, 11, 31);
      return null;
    },
  },

  // ---------- TDS ----------
  {
    name: "TDS Payment (Challan 281)",
    description: "Monthly TDS deposit",
    primaryTag: "TDS",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => new Date(year, month + 1, 7),
    // Due 7th of next month
  },
  {
    name: "TDS Return (Form 26Q)",
    description: "Quarterly TDS return for non-salary deductions",
    primaryTag: "TDS",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => {
      // Due dates: 31 Jul (Q1), 31 Oct (Q2), 31 Jan (Q3), 31 May (Q4)
      const quarterEnds = { 5: [6, 31], 8: [9, 31], 11: [0, 31], 2: [4, 31] };
      if (quarterEnds[month]) {
        const [dueMonth, dueDay] = quarterEnds[month];
        const dueYear = dueMonth < month ? year + 1 : year;
        return new Date(dueYear, dueMonth, dueDay);
      }
      return null;
    },
  },
  {
    name: "TDS Return (Form 24Q)",
    description: "Quarterly TDS return for salary",
    primaryTag: "TDS",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => {
      const quarterEnds = { 5: [6, 31], 8: [9, 31], 11: [0, 31], 2: [4, 31] };
      if (quarterEnds[month]) {
        const [dueMonth, dueDay] = quarterEnds[month];
        const dueYear = dueMonth < month ? year + 1 : year;
        return new Date(dueYear, dueMonth, dueDay);
      }
      return null;
    },
  },

  // ---------- Income Tax ----------
  {
    name: "Advance Tax (Q1)",
    description: "15% of estimated tax — due 15th June",
    primaryTag: "Income Tax",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => (month === 5 ? new Date(year, 5, 15) : null),
  },
  {
    name: "Advance Tax (Q2)",
    description: "45% cumulative — due 15th Sep",
    primaryTag: "Income Tax",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => (month === 8 ? new Date(year, 8, 15) : null),
  },
  {
    name: "Advance Tax (Q3)",
    description: "75% cumulative — due 15th Dec",
    primaryTag: "Income Tax",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => (month === 11 ? new Date(year, 11, 15) : null),
  },
  {
    name: "Advance Tax (Q4)",
    description: "100% cumulative — due 15th Mar",
    primaryTag: "Income Tax",
    secondaryTag: "Quarterly",
    getDueDate: (month, year) => (month === 2 ? new Date(year, 2, 15) : null),
  },

  // ---------- Payroll ----------
  {
    name: "PF Payment",
    description: "Monthly EPF/EPS contribution deposit",
    primaryTag: "Payroll",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => new Date(year, month + 1, 15),
  },
  {
    name: "ESI Payment",
    description: "Monthly ESI contribution deposit",
    primaryTag: "Payroll",
    secondaryTag: "Monthly",
    getDueDate: (month, year) => new Date(year, month + 1, 15),
  },
];


/* ============================================================
   CONDITIONAL COMPLIANCES
   These apply only if certain business conditions are met.
============================================================ */

export const CONDITIONAL_COMPLIANCES = [
  {
    name: "ITR-6 (Company)",
    description: "Income Tax Return for companies (not claiming exemption u/s 11)",
    primaryTag: "Income Tax",
    secondaryTag: "Annual",
    applicabilityInfo: "All companies registered under the Companies Act, except those claiming exemption under Section 11.",
    dueDateRule: "31st October of the assessment year (if tax audit applicable), else 31st July",
    dueMonth: 9, // October (0-indexed)
    dueDay: 31,
  },
  {
    name: "Tax Audit (Section 44AB)",
    description: "Mandatory audit if turnover exceeds threshold",
    primaryTag: "Income Tax",
    secondaryTag: "Annual",
    applicabilityInfo: "Business turnover > ₹1 Cr (₹10 Cr if 95%+ digital transactions), or profession receipts > ₹50L.",
    dueDateRule: "30th September of the assessment year",
    dueMonth: 8,
    dueDay: 30,
  },
  {
    name: "Transfer Pricing Audit (Section 92E)",
    description: "Audit for international or specified domestic transactions",
    primaryTag: "Income Tax",
    secondaryTag: "Annual",
    applicabilityInfo: "Companies with international transactions or specified domestic transactions exceeding ₹20 Cr.",
    dueDateRule: "31st October of the assessment year",
    dueMonth: 9,
    dueDay: 31,
  },
  {
    name: "GST Annual Return (GSTR-9)",
    description: "Annual consolidated GST return",
    primaryTag: "GST",
    secondaryTag: "Annual",
    applicabilityInfo: "All regular GST-registered taxpayers with aggregate turnover exceeding ₹2 Cr (audit GSTR-9C if > ₹5 Cr).",
    dueDateRule: "31st December of the following financial year",
    dueMonth: 11,
    dueDay: 31,
  },
  {
    name: "DIR-3 KYC",
    description: "Annual KYC for all DIN holders",
    primaryTag: "MCA",
    secondaryTag: "Annual",
    applicabilityInfo: "Every individual holding a DIN as on 31st March must file KYC before 30th September.",
    dueDateRule: "30th September every year",
    dueMonth: 8,
    dueDay: 30,
  },
  {
    name: "MSME-1",
    description: "Half-yearly return for outstanding payments to MSMEs",
    primaryTag: "MCA",
    secondaryTag: "Half-Yearly",
    applicabilityInfo: "Companies with outstanding payments to MSME vendors beyond 45 days.",
    dueDateRule: "31st October (Apr-Sep) and 30th April (Oct-Mar)",
    dueMonth: 9,
    dueDay: 31,
  },
  {
    name: "DPT-3 (Return of Deposits)",
    description: "Annual return of deposits and outstanding receipts of money",
    primaryTag: "MCA",
    secondaryTag: "Annual",
    applicabilityInfo: "Every company (other than Government company) that has accepted deposits or outstanding money.",
    dueDateRule: "30th June every year",
    dueMonth: 5,
    dueDay: 30,
  },
  {
    name: "Professional Tax",
    description: "Monthly/Annual professional tax payment",
    primaryTag: "Payroll",
    secondaryTag: "Varies by state",
    applicabilityInfo: "Applicable in states that levy professional tax. Rates and due dates vary by state.",
    dueDateRule: "Varies by state — typically monthly or half-yearly",
  },
];
