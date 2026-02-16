/**
 * Compliance Module — Runtime Constants & Shape Documentation
 * -----------------------------------------------------------
 * This file only defines data structures + static rules.
 * No UI logic here.
 *
 * IMPORTANT FOR FUTURE:
 * - These act like backend contracts.
 * - When Redux/API is added, responses MUST match these shapes.
 * - Do NOT move business rules to components — keep them centralized here.
 */


/* ============================================================
   ENUM-LIKE VALUES (formerly TypeScript union types)
   These behave as controlled vocabularies across the app
============================================================ */

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


/* ============================================================
   SHAPE DOCUMENTATION (replaces TS interfaces)
   These are NOT validators — only reference documentation.
   Later Redux slices / API adapters must follow this shape.
============================================================ */

/**
CompanyComplianceProfile
{
  id: string,
  organization_id: string,
  company_type: CompanyType,
  cin?: string,
  llpin?: string,
  date_of_incorporation?: string,
  financial_year_end: number,
  registered_office_address?: string,
  authorized_capital: number,
  paid_up_capital: number,
  mca_status: string,
  last_mca_check_at?: string,
  created_at: string,
  updated_at: string
}
*/

/**
Director
{
  id: string,
  organization_id: string,
  din: string,
  name: string,
  designation?: string,
  date_of_appointment?: string,
  date_of_cessation?: string,
  dsc_expiry_date?: string,
  dsc_holder_name?: string,
  email?: string,
  phone?: string,
  is_active: boolean,
  created_at: string,
  updated_at: string
}
*/

/**
ComplianceObligation
{
  id: string,
  organization_id: string,
  compliance_type: ComplianceType,
  form_name: string,
  form_description?: string,
  due_date: string,
  filing_date?: string,
  status: ComplianceStatus,
  financial_year?: string,
  assessment_year?: string,
  trigger_event?: string,
  trigger_date?: string,
  filing_fee: number,
  late_fee: number,
  srn_number?: string,
  acknowledgement_number?: string,
  notes?: string,
  documents: string[],
  priority: number,
  created_at: string,
  updated_at: string
}
*/

/**
AdvanceTaxCalculation
{
  id: string,
  organization_id: string,
  financial_year: string,
  quarter: number,
  due_date: string,
  estimated_annual_income: number,
  estimated_tax_liability: number,
  cumulative_percentage: number,
  tax_payable_this_quarter: number,
  tax_paid_till_date: number,
  shortfall: number,
  interest_234b: number,
  interest_234c: number,
  payment_status: ComplianceStatus,
  payment_date?: string,
  challan_number?: string,
  notes?: string,
  created_at: string,
  updated_at: string
}
*/

/**
TaxDocument
{
  id: string,
  organization_id: string,
  document_type: string,
  assessment_year: string,
  file_name: string,
  file_url: string,
  file_size?: number,
  filing_date?: string,
  acknowledgement_number?: string,
  notes?: string,
  created_at: string,
  updated_at: string
}
*/

/**
ComplianceEvent
{
  id: string,
  organization_id: string,
  event_type: string,
  event_date: string,
  event_description?: string,
  required_form: string,
  filing_deadline: string,
  is_acknowledged: boolean,
  related_obligation_id?: string,
  metadata: object,
  created_at: string
}
*/


/* ============================================================
   MCA Annual Filing Rules by Company Type
   (Business Logic — DO NOT MOVE TO UI)
============================================================ */

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


/* ============================================================
   Event-based compliance triggers
============================================================ */

export const EVENT_COMPLIANCE_MAP = {
  director_change: { form: 'DIR-12', deadline_days: 30, description: 'Change in Directors' },
  address_change: { form: 'INC-22', deadline_days: 30, description: 'Change in Registered Office' },
  capital_change: { form: 'SH-7', deadline_days: 30, description: 'Increase in Authorized Capital' },
  name_change: { form: 'INC-24', deadline_days: 30, description: 'Change in Company Name' },
  charge_creation: { form: 'CHG-1', deadline_days: 30, description: 'Creation of Charge' },
  charge_modification: { form: 'CHG-1', deadline_days: 30, description: 'Modification of Charge' },
  charge_satisfaction: { form: 'CHG-4', deadline_days: 30, description: 'Satisfaction of Charge' },
};


/* ============================================================
   Advance Tax Schedule
============================================================ */

export const ADVANCE_TAX_SCHEDULE = [
  { quarter: 1, dueDate: '15-Jun', cumulative: 15 },
  { quarter: 2, dueDate: '15-Sep', cumulative: 45 },
  { quarter: 3, dueDate: '15-Dec', cumulative: 75 },
  { quarter: 4, dueDate: '15-Mar', cumulative: 100 },
];


/* ============================================================
   Tax Audit Thresholds (Section 44AB)
   NOTE: Financial logic — UI must only read this.
============================================================ */

export const TAX_AUDIT_THRESHOLDS = {
  business_turnover: 10000000,        // ₹1 Cr
  business_turnover_digital: 100000000, // ₹10 Cr
  profession_receipts: 5000000,       // ₹50 L
  presumptive_44ad_opted_out: true,
};
