// src/controllers/compliance/complianceTemplate.controller.js

// Template data
const templates = [
  {
    "name": "GST Return – GSTR-1",
    "category_tag": "gst",
    "subtag": "GSTR-1",
    "description": "Outward supply details",
    "recurrence_type": "monthly",
    "recurrence_config": { "due_day": 11, "offset_months": 1 },
    "is_active": true
  },
  {
    "name": "GST Return – GSTR-3B",
    "category_tag": "gst",
    "subtag": "GSTR-3B",
    "description": "Summary of sales, ITC and tax payable",
    "recurrence_type": "monthly",
    "recurrence_config": { "due_day": 20, "offset_months": 1 },
    "is_active": true
  },
  {
    "name": "TDS Payment",
    "category_tag": "tds",
    "subtag": "TDS Payment",
    "description": "Monthly TDS deposit",
    "recurrence_type": "monthly",
    "recurrence_config": { "due_day": 7, "offset_months": 1 },
    "is_active": true
  },
  {
    "name": "TDS Return – Form 24Q / 26Q",
    "category_tag": "tds",
    "subtag": "TDS 24Q/26Q",
    "description": "Quarterly TDS return filing",
    "recurrence_type": "quarterly",
    "recurrence_config": { "due_dates": ["31-07", "31-10", "31-01", "31-05"] },
    "is_active": true
  },
  {
    "name": "PF Contribution",
    "category_tag": "payroll",
    "subtag": "PF",
    "description": "Monthly Provident Fund contribution",
    "recurrence_type": "monthly",
    "recurrence_config": { "due_day": 15, "offset_months": 1 },
    "is_active": true
  },
  {
    "name": "ESIC Contribution",
    "category_tag": "payroll",
    "subtag": "ESIC",
    "description": "Monthly ESIC contribution",
    "recurrence_type": "monthly",
    "recurrence_config": { "due_day": 15, "offset_months": 1 },
    "is_active": true
  },
  {
    "name": "Income Tax Return (ITR)",
    "category_tag": "income_tax",
    "subtag": "ITR",
    "description": "Annual income tax filing for company",
    "recurrence_type": "annual",
    "recurrence_config": { "due_day": 30, "due_month": 9 },
    "is_active": true
  },
  {
    "name": "Tax Audit Report",
    "category_tag": "income_tax",
    "subtag": "Form 3CA/3CD",
    "description": "Tax audit report filing (if applicable)",
    "recurrence_type": "annual",
    "recurrence_config": { "due_day": 30, "due_month": 9 },
    "is_active": true
  },
  {
    "name": "Transfer Pricing Report",
    "category_tag": "income_tax",
    "subtag": "Form 3CEB",
    "description": "Transfer pricing report for international/specified domestic transactions",
    "recurrence_type": "annual",
    "recurrence_config": { "due_day": 30, "due_month": 11 },
    "is_active": true
  },
  {
    "name": "Form 16 & 16A Issuance",
    "category_tag": "tds",
    "subtag": "Form 16/16A",
    "description": "Issuance of TDS certificates to employees and vendors",
    "recurrence_type": "annual",
    "recurrence_config": { "due_day": 15, "due_month": 6 },
    "is_active": true
  },
  {
    "name": "Advance Tax",
    "category_tag": "income_tax",
    "subtag": "Advance Tax",
    "description": "Quarterly advance tax installments",
    "recurrence_type": "quarterly",
    "recurrence_config": { "due_dates": ["15-06", "15-09", "15-12", "15-03"] },
    "is_active": true
  }
];

// Controller function
export const getAllTemplates = (req, res) => {
  res.json({ success: true, data: templates });
};