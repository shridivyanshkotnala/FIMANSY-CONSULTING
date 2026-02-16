import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import { MCA_ANNUAL_FILINGS, ADVANCE_TAX_SCHEDULE, EVENT_COMPLIANCE_MAP } from './types';

/**
 * Utility Layer — Compliance Calculations
 * --------------------------------------
 * Pure business logic only.
 *
 * VERY IMPORTANT:
 * - No UI state should live here
 * - Redux selectors will call these
 * - API responses must be normalized BEFORE entering here
 */


/* ============================================================
   Financial Year Helpers
============================================================ */

export function getCurrentFinancialYear() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  // FY in India: April → March
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function getAssessmentYear(fy) {
  const [startYear] = fy.split('-').map(Number);
  return `AY ${startYear + 1}-${(startYear + 2).toString().slice(-2)}`;
}


/* ============================================================
   Due Date Calculations
============================================================ */

export function getDaysUntilDue(dueDate) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  return differenceInDays(due, today);
}

export function getCompliancePriority(dueDate) {
  const daysUntil = getDaysUntilDue(dueDate);

  if (daysUntil < 0) return { priority: 1, severity: 'critical' };
  if (daysUntil <= 7) return { priority: 2, severity: 'critical' };
  if (daysUntil <= 15) return { priority: 3, severity: 'warning' };
  if (daysUntil <= 30) return { priority: 4, severity: 'warning' };

  return { priority: 5, severity: 'info' };
}


/* ============================================================
   DSC Status Logic
============================================================ */

export function getDscStatus(expiryDate) {
  if (!expiryDate) {
    return { status: 'unknown', daysRemaining: 0, message: 'DSC expiry date not set' };
  }

  const daysRemaining = getDaysUntilDue(expiryDate);

  if (daysRemaining < 0) return { status: 'expired', daysRemaining, message: 'DSC has expired' };
  if (daysRemaining <= 30) return { status: 'expiring_soon', daysRemaining, message: `DSC expires in ${daysRemaining} days` };

  return { status: 'valid', daysRemaining, message: `DSC valid for ${daysRemaining} days` };
}


/* ============================================================
   MCA Annual Calendar Generator
============================================================ */

export function generateAnnualComplianceCalendar(companyType, fyEndMonth, fy) {
  const filings = MCA_ANNUAL_FILINGS[companyType];
  const [startYear] = fy.split('-').map(Number);
  const fyEndDate = new Date(startYear + 1, fyEndMonth - 1, 31);

  const obligations = [];

  filings.forEach(filing => {
    let dueDate;

    if (companyType === 'llp') {
      dueDate = filing.form === 'Form 8'
        ? new Date(startYear + 1, 9, 30)
        : new Date(startYear + 1, 4, 30);

    } else if (companyType === 'opc') {
      dueDate = addDays(fyEndDate, filing.form === 'AOC-4' ? 180 : 60);

    } else {
      const agmDate = addDays(fyEndDate, 180);
      dueDate = addDays(agmDate, filing.form === 'AOC-4' ? 30 : 60);
    }

    obligations.push({
      compliance_type: 'mca_annual',
      form_name: filing.form,
      form_description: filing.description,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      status: 'not_started',
      financial_year: fy,
      priority: 5,
    });
  });

  return obligations;
}


/* ============================================================
   Advance Tax Calculator
   NOTE: Simplified estimation logic — not final filing value
============================================================ */

export function generateAdvanceTaxSchedule(fy, estimatedIncome) {
  const [startYear] = fy.split('-').map(Number);

  // Corporate tax approximation
  const taxRate = 0.312;
  const estimatedTax = estimatedIncome * taxRate;

  const monthMap = { Jun: 5, Sep: 8, Dec: 11, Mar: 2 };

  return ADVANCE_TAX_SCHEDULE.map((schedule, index) => {
    const [day, monthStr] = schedule.dueDate.split('-');
    const month = monthMap[monthStr];
    const year = month >= 3 ? startYear : startYear + 1;

    const dueDate = new Date(year, month, parseInt(day));

    const cumulativeTax = (estimatedTax * schedule.cumulative) / 100;
    const previousCumulative =
      index > 0 ? (estimatedTax * ADVANCE_TAX_SCHEDULE[index - 1].cumulative) / 100 : 0;

    return {
      quarter: schedule.quarter,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      cumulative: schedule.cumulative,
      taxPayable: cumulativeTax - previousCumulative,
    };
  });
}


/* ============================================================
   Audit Applicability (44AB)
============================================================ */

export function isTaxAuditApplicable(turnover, digitalTransactionPercentage = 0) {
  if (turnover > 100000000) {
    return { applicable: true, reason: 'Turnover exceeds ₹10 Cr' };
  }

  if (turnover > 10000000 && digitalTransactionPercentage < 95) {
    return { applicable: true, reason: 'Turnover exceeds ₹1 Cr and digital transactions are less than 95%' };
  }

  return { applicable: false, reason: 'Turnover is below audit threshold' };
}


/* ============================================================
   Event Filing Trigger
============================================================ */

export function getEventFilingRequirement(eventType, eventDate) {
  const requirement = EVENT_COMPLIANCE_MAP[eventType];
  if (!requirement) return null;

  return {
    form: requirement.form,
    deadline: addDays(eventDate, requirement.deadline_days),
    description: requirement.description,
  };
}


/* ============================================================
   Alert Formatters (Used by Dashboard / Feed UI)
============================================================ */

export function formatComplianceAlert(obligation) {
  const daysUntil = getDaysUntilDue(obligation.due_date);
  const { severity } = getCompliancePriority(obligation.due_date);

  let message;
  let actionLabel;

  if (daysUntil < 0) {
    message = `${obligation.form_name} is overdue by ${Math.abs(daysUntil)} days. Late fees may apply.`;
    actionLabel = 'File Now';
  } else if (daysUntil === 0) {
    message = `${obligation.form_name} is due today!`;
    actionLabel = 'File Now';
  } else if (daysUntil <= 7) {
    message = `${obligation.form_name} due in ${daysUntil} days. Complete filing soon.`;
    actionLabel = 'Start Filing';
  } else {
    message = `${obligation.form_name} due in ${daysUntil} days.`;
    actionLabel = 'View Details';
  }

  return { message, actionLabel, severity };
}


export function formatDscAlert(director) {
  const status = getDscStatus(director.dsc_expiry_date);

  if (status.status === 'valid' && status.daysRemaining > 30) return null;

  if (status.status === 'expired') {
    return {
      message: `DSC for ${director.name} has expired. Filings blocked until renewed.`,
      actionLabel: 'Renew DSC',
      severity: 'critical',
    };
  }

  if (status.daysRemaining <= 7) {
    return {
      message: `DSC for ${director.name} expires in ${status.daysRemaining} days.`,
      actionLabel: 'Renew Now',
      severity: 'critical',
    };
  }

  return {
    message: `DSC for ${director.name} expires in ${status.daysRemaining} days.`,
    actionLabel: 'Schedule Renewal',
    severity: 'warning',
  };
}
