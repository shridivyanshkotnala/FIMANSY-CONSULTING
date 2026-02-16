/**
 * Payroll Module Contracts — Indian MSME Compliance
 * --------------------------------------------------
 * This file defines:
 * - Allowed enum values
 * - Data shape documentation
 * - Statutory constants
 *
 * NOTE:
 * These shapes act as backend contracts.
 * Backend API responses must follow these shapes.
 */


/* ============================================================
   ENUM-LIKE VALUES
============================================================ */

export const EmploymentTypes = ['full_time', 'part_time', 'contract', 'intern'];
export const PaymentFrequencies = ['monthly', 'weekly', 'bi_weekly'];
export const PayrollStatuses = ['draft', 'pending_approval', 'approved', 'processing', 'completed', 'failed'];
export const TaxRegimes = ['old', 'new'];


/* ============================================================
   SHAPE DOCUMENTATION (Reference Only)
============================================================ */

/**
Employee
{
  id, organization_id, employee_code,
  first_name, last_name, email,
  phone?, date_of_birth?, gender?,
  employment_type,
  department?, designation?,
  date_of_joining, date_of_exit?,
  reporting_manager_id?,
  bank_name?, bank_account_number?, bank_ifsc_code?,
  pan?, uan?, esic_number?,
  preferred_tax_regime,
  is_active,
  created_at, updated_at
}
*/

/**
SalaryStructure
Annual salary breakup for statutory calculations
Must remain compatible with payrollEngine formulas
*/

/**
PayrollRun
Represents one salary processing cycle
*/

/**
PayrollItem
Individual employee salary calculation record
Contains earnings + deductions + compliance flags
*/

/**
TaxDeclaration
Employee tax investment declaration (old/new regime comparison)
*/

/**
StatutoryChallan
Government payment record (EPF/ESI/PT/TDS)
*/

/**
ProfessionalTaxRule
State-wise PT slab configuration
*/

/**
StatutoryCalculation
Used by payrollEngine
*/

/**
WageCodeValidation
Used by payrollEngine
*/


/* ============================================================
   STATUTORY CONSTANTS
   (Used by payrollEngine — DO NOT MODIFY casually)
============================================================ */

export const EPF_EMPLOYEE_RATE = 0.12;       // 12%
export const EPF_EMPLOYER_RATE = 0.12;       // 12%
export const EPF_CEILING = 15000;

export const ESI_EMPLOYEE_RATE = 0.0075;     // 0.75%
export const ESI_EMPLOYER_RATE = 0.0325;     // 3.25%
export const ESI_CEILING = 21000;

export const WAGE_CODE_BASIC_PERCENTAGE = 0.5; // 50% rule


/* ============================================================
   TAX SLABS — FY 2025-26
============================================================ */

export const NEW_REGIME_SLABS = [
  { min: 0, max: 400000, rate: 0 },
  { min: 400001, max: 800000, rate: 0.05 },
  { min: 800001, max: 1200000, rate: 0.10 },
  { min: 1200001, max: 1600000, rate: 0.15 },
  { min: 1600001, max: 2000000, rate: 0.20 },
  { min: 2000001, max: 2400000, rate: 0.25 },
  { min: 2400001, max: Infinity, rate: 0.30 },
];

export const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250001, max: 500000, rate: 0.05 },
  { min: 500001, max: 1000000, rate: 0.20 },
  { min: 1000001, max: Infinity, rate: 0.30 },
];


/* ============================================================
   SUPPORTED STATES (for PT rules)
============================================================ */

export const INDIAN_STATES = [
  { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'DL', name: 'Delhi' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TS', name: 'Telangana' },
  { code: 'KL', name: 'Kerala' },
  { code: 'HR', name: 'Haryana' },
  { code: 'PB', name: 'Punjab' },
];
