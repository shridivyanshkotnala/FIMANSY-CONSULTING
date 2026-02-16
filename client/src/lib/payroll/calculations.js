// Payroll Calculation Engine — Indian Statutory Compliance
// PURE BUSINESS LOGIC FILE
// Never connect UI state or database logic here.

import {
  EPF_EMPLOYEE_RATE,
  EPF_EMPLOYER_RATE,
  EPF_CEILING,
  ESI_EMPLOYEE_RATE,
  ESI_EMPLOYER_RATE,
  ESI_CEILING,
  WAGE_CODE_BASIC_PERCENTAGE,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
} from './types';


/* ============================================================
   EPF
============================================================ */

export function calculateEPF(basicMonthly) {
  const epfBasic = Math.min(basicMonthly, EPF_CEILING);
  return {
    employee: Math.round(epfBasic * EPF_EMPLOYEE_RATE),
    employer: Math.round(epfBasic * EPF_EMPLOYER_RATE),
  };
}


/* ============================================================
   ESI
============================================================ */

export function calculateESI(grossMonthly) {
  if (grossMonthly > ESI_CEILING) return { employee: 0, employer: 0 };

  return {
    employee: Math.round(grossMonthly * ESI_EMPLOYEE_RATE),
    employer: Math.round(grossMonthly * ESI_EMPLOYER_RATE),
  };
}


/* ============================================================
   PROFESSIONAL TAX
============================================================ */

export function calculateProfessionalTax(grossMonthly, stateRules, isFebruary = false) {
  const rule = stateRules.find(r =>
    grossMonthly >= r.min_salary &&
    (r.max_salary === null || grossMonthly <= r.max_salary)
  );

  if (!rule) return 0;

  let tax = rule.monthly_tax;
  if (isFebruary && rule.february_extra) tax += rule.february_extra;

  return tax;
}


/* ============================================================
   WAGE CODE VALIDATION (50% BASIC RULE)
============================================================ */

export function validateWageCode(ctcAnnual, basicAnnual) {
  const basicPercentage = ctcAnnual > 0 ? (basicAnnual / ctcAnnual) * 100 : 0;
  const requiredBasic = ctcAnnual * WAGE_CODE_BASIC_PERCENTAGE;
  const shortfall = Math.max(0, requiredBasic - basicAnnual);
  const isCompliant = basicPercentage >= 50;

  let riskLevel;
  const suggestions = [];

  if (isCompliant) {
    riskLevel = 'low';
  } else if (basicPercentage >= 40) {
    riskLevel = 'medium';
    suggestions.push(`Increase Basic by ₹${formatIndianNumber(shortfall / 12)}/month to comply`);
    suggestions.push('Consider reducing Special Allowance and adding to Basic');
  } else {
    riskLevel = 'high';
    suggestions.push(`Critical: Basic is only ${basicPercentage.toFixed(1)}% of CTC`);
    suggestions.push(`Increase Basic by ₹${formatIndianNumber(shortfall / 12)}/month`);
    suggestions.push('Restructure salary to avoid statutory penalties');
  }

  return {
    isCompliant,
    basicPercentage,
    requiredBasic,
    currentBasic: basicAnnual,
    shortfall,
    riskLevel,
    suggestions,
  };
}


/* ============================================================
   COMBINED STATUTORY DEDUCTIONS
============================================================ */

export function calculateStatutoryDeductions(basicMonthly, grossMonthly, ptRules, isFebruary = false) {
  const epf = calculateEPF(basicMonthly);
  const esi = calculateESI(grossMonthly);
  const professionalTax = calculateProfessionalTax(grossMonthly, ptRules, isFebruary);

  return {
    epfEmployee: epf.employee,
    epfEmployer: epf.employer,
    esiEmployee: esi.employee,
    esiEmployer: esi.employer,
    professionalTax,
    totalEmployeeDeductions: epf.employee + esi.employee + professionalTax,
    totalEmployerContributions: epf.employer + esi.employer,
  };
}


/* ============================================================
   INCOME TAX CALCULATION
============================================================ */

export function calculateIncomeTax(taxableIncome, regime) {
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  let tax = 0;

  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      const taxable = Math.min(taxableIncome, slab.max) - slab.min;
      tax += taxable * slab.rate;
    }
  }

  if (regime === 'new' && taxableIncome <= 700000) tax = 0;
  if (regime === 'old' && taxableIncome <= 500000) tax = 0;

  const cess = Math.round(tax * 0.04);
  return { tax: Math.round(tax), cess, total: Math.round(tax) + cess };
}


/* ============================================================
   REGIME RECOMMENDER
============================================================ */

export function recommendTaxRegime(grossAnnualIncome, deductions) {
  const newIncome = Math.max(0, grossAnnualIncome - 75000);
  const newTax = calculateIncomeTax(newIncome, 'new').total;

  const oldDed =
    Math.min(deductions.sec80c, 150000) +
    Math.min(deductions.sec80d, 75000) +
    deductions.sec80e +
    deductions.hra +
    Math.min(deductions.sec24, 200000) +
    deductions.standardDeduction;

  const oldIncome = Math.max(0, grossAnnualIncome - oldDed);
  const oldTax = calculateIncomeTax(oldIncome, 'old').total;

  return {
    recommended: newTax <= oldTax ? 'new' : 'old',
    oldRegimeTax: oldTax,
    newRegimeTax: newTax,
    savings: Math.abs(newTax - oldTax),
  };
}


/* ============================================================
   MONTHLY TDS
============================================================ */

export function calculateMonthlyTDS(monthNumber, grossMonthly, taxableIncomeYTD, taxPaidYTD, regime, deductions) {
  const remainingMonths = 12 - monthNumber + 1;
  const projectedAnnualGross = taxableIncomeYTD + grossMonthly * remainingMonths;

  let totalDeductions =
    regime === 'new'
      ? 75000
      : Math.min(deductions.sec80c, 150000) +
        Math.min(deductions.sec80d, 75000) +
        deductions.sec80e +
        deductions.hra +
        Math.min(deductions.sec24, 200000) +
        deductions.standardDeduction;

  const projectedTaxable = Math.max(0, projectedAnnualGross - totalDeductions);
  const projectedTax = calculateIncomeTax(projectedTaxable, regime).total;

  const remainingTax = Math.max(0, projectedTax - taxPaidYTD);
  return Math.round(remainingTax / remainingMonths);
}


/* ============================================================
   HRA EXEMPTION
============================================================ */

export function calculateHRAExemption(basicMonthly, hraReceived, rentPaid, isMetroCity) {
  if (!rentPaid) return 0;

  const rentMinus10 = Math.max(0, rentPaid - basicMonthly * 0.1);
  const percentBasic = isMetroCity ? basicMonthly * 0.5 : basicMonthly * 0.4;

  return Math.min(hraReceived, rentMinus10, percentBasic);
}


/* ============================================================
   CTC BREAKUP GENERATOR
============================================================ */

export function generateSalaryBreakup(ctcAnnual, options = {}) {
  const { hraPercentage = 0.4, includeEPF = true, includeESI = false, includeGratuity = true } = options;

  const basic = Math.round(ctcAnnual * 0.5);
  const basicMonthly = basic / 12;

  const hra = Math.round(basic * hraPercentage);

  const employerEPF = includeEPF ? Math.round(Math.min(basicMonthly, EPF_CEILING) * EPF_EMPLOYER_RATE * 12) : 0;
  const gratuity = includeGratuity ? Math.round(basic * 0.0481) : 0;

  const roughGrossMonthly = ctcAnnual / 12;
  const employerESI = includeESI && roughGrossMonthly <= ESI_CEILING
    ? Math.round(roughGrossMonthly * ESI_EMPLOYER_RATE * 12)
    : 0;

  const conveyance = 19200;
  const medicalAllowance = 15000;

  const specialAllowance = Math.max(
    0,
    ctcAnnual - basic - hra - conveyance - medicalAllowance - employerEPF - employerESI - gratuity
  );

  const monthlyGross = (basic + hra + specialAllowance + conveyance + medicalAllowance) / 12;

  const epfEmployee = includeEPF ? Math.min(basicMonthly, EPF_CEILING) * EPF_EMPLOYEE_RATE : 0;
  const esiEmployee = includeESI && monthlyGross <= ESI_CEILING ? monthlyGross * ESI_EMPLOYEE_RATE : 0;

  return {
    basic,
    hra,
    specialAllowance,
    conveyance,
    medicalAllowance,
    employerEPF,
    employerESI,
    gratuity,
    totalCTC: ctcAnnual,
    monthlyGross,
    monthlyNet: monthlyGross - epfEmployee - esiEmployee - 200,
  };
}


/* ============================================================
   FORMATTERS
============================================================ */

export function formatIndianNumber(num) {
  const abs = Math.abs(num);

  if (abs >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${(num / 100000).toFixed(2)} L`;

  return new Intl.NumberFormat('en-IN').format(Math.round(num));
}

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
