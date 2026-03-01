//dummy data from frontend
export const CompanyTypes = [
  'private_limited',
  'opc',
  'llp',
  'public_limited',
  'partnership',
  'proprietorship',
];

export const ComplianceStatuses = [
  'not_started',
  'in_progress',
  'filed',
  'overdue',
  'not_applicable',
];

export const ComplianceTypes = [
  'mca_annual',
  'mca_event',
  'income_tax',
  'advance_tax',
  'gst',
  'tds',
];

export const MCA_ANNUAL_FILINGS = {
  private_limited: [
    { form: 'AOC-4', description: 'Financial Statements', dueDateLogic: '30 days from AGM' },
    { form: 'MGT-7', description: 'Annual Return', dueDateLogic: '60 days from AGM' },
  ],
  opc: [
    { form: 'AOC-4', description: 'Financial Statements', dueDateLogic: '180 days from FY end' },
    { form: 'MGT-7A', description: 'Annual Return (OPC)', dueDateLogic: '60 days from FY end' },
  ],
  llp: [
    { form: 'Form 8', description: 'Statement of Account', dueDateLogic: '30th October' },
    { form: 'Form 11', description: 'Annual Return', dueDateLogic: '30th May' },
  ],
  public_limited: [
    { form: 'AOC-4', description: 'Financial Statements', dueDateLogic: '30 days from AGM' },
    { form: 'MGT-7', description: 'Annual Return', dueDateLogic: '60 days from AGM' },
  ],
  partnership: [],
  proprietorship: [],
};

export const EVENT_COMPLIANCE_MAP = {
  director_change: { form: 'DIR-12', deadline_days: 30, description: 'Change in Directors' },
  address_change: { form: 'INC-22', deadline_days: 30, description: 'Change in Registered Office' },
  capital_change: { form: 'SH-7', deadline_days: 30, description: 'Increase in Authorized Capital' },
  name_change: { form: 'INC-24', deadline_days: 30, description: 'Change in Company Name' },
  charge_creation: { form: 'CHG-1', deadline_days: 30, description: 'Creation of Charge' },
  charge_modification: { form: 'CHG-1', deadline_days: 30, description: 'Modification of Charge' },
  charge_satisfaction: { form: 'CHG-4', deadline_days: 30, description: 'Satisfaction of Charge' },
};

export const ADVANCE_TAX_SCHEDULE = [
  { quarter: 1, dueDate: '15-Jun', cumulative: 15 },
  { quarter: 2, dueDate: '15-Sep', cumulative: 45 },
  { quarter: 3, dueDate: '15-Dec', cumulative: 75 },
  { quarter: 4, dueDate: '15-Mar', cumulative: 100 },
];

export const TAX_AUDIT_THRESHOLDS = {
  business_turnover: 10000000,
  business_turnover_digital: 100000000,
  profession_receipts: 5000000,
  presumptive_44ad_opted_out: true,
};