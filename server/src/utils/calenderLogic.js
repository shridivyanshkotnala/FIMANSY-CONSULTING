/**
 * Get financial year start and end dates
 * Supports formats: "2025-26" or "2025-2026"
 */
function getFinancialYearDates(financialYear) {
  const [startYearStr, endYearStr] = financialYear.split("-");

  const startYear = Number(startYearStr);

  let endYear;
  if (endYearStr.length === 2) {
    // format: 2025-26
    endYear = Number("20" + endYearStr);
  } else {
    // format: 2025-2026
    endYear = Number(endYearStr);
  }

  // Set to start/end of day to avoid time comparison issues
  const start = new Date(startYear, 3, 1); // April 1
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endYear, 2, 31); // March 31
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Build safe date that handles invalid dates (like Feb 30)
 */
function buildSafeDate(year, monthIndex, day) {
  // Create date and normalize to start of day
  const date = new Date(year, monthIndex, day);
  date.setHours(0, 0, 0, 0);
  
  // Check if date is valid (month didn't roll over)
  if (date.getMonth() !== monthIndex) {
    // Invalid date - use last day of month
    return new Date(year, monthIndex + 1, 0);
  }
  return date;
}

/**
 * Generate monthly due dates with proper year handling
 */
function generateMonthlyDueDates(template, fyStart, fyEnd) {
  const dueDates = [];
  
  // Validate template has required config
  if (!template.recurrence_config || !template.recurrence_config.due_day) {
    console.warn(`⚠️ Template ${template.name} missing due_day in recurrence_config`);
    return [];
  }

  const { due_day, offset_months = 0 } = template.recurrence_config;
  
  // Start from first month of FY
  let currentYear = fyStart.getFullYear();
  let currentMonth = fyStart.getMonth(); // April = 3
  
  // Maximum 12 months in a FY
  const MAX_ITERATIONS = 12;
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
    // Calculate due date with offset
    const totalMonths = currentMonth + offset_months;
    const dueYear = currentYear + Math.floor(totalMonths / 12);
    const dueMonth = totalMonths % 12;
    
    const dueDate = buildSafeDate(dueYear, dueMonth, due_day);
    
    // Only add if within FY
    if (dueDate >= fyStart && dueDate <= fyEnd) {
      dueDates.push(dueDate);
    }
    
    // Move to next month
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    
    iterations++;
    
    // Stop if we've gone past FY end
    if (currentYear > fyEnd.getFullYear() || 
        (currentYear === fyEnd.getFullYear() && currentMonth > fyEnd.getMonth())) {
      break;
    }
  }
  
  console.log(`📅 Generated ${dueDates.length} monthly due dates for ${template.name}`);
  return dueDates;
}

/**
 * Generate quarterly due dates
 * Supports due_dates array in format ["DD-MM", "DD-MM", "DD-MM", "DD-MM"]
 */
function generateQuarterlyDueDates(template, fyStart, fyEnd) {
  const dueDates = [];
  
  // Validate template has required config
  if (!template.recurrence_config || !template.recurrence_config.due_dates) {
    console.warn(`⚠️ Template ${template.name} missing due_dates in recurrence_config`);
    return [];
  }

  const { due_dates, offset_months = 0 } = template.recurrence_config;
  
  // Map quarters to their ending months (0-indexed)
  // Q1: March (2), Q2: June (5), Q3: September (8), Q4: December (11)
  const quarterEndMonths = [2, 5, 8, 11];
  
  for (let i = 0; i < quarterEndMonths.length; i++) {
    const dueDateStr = due_dates[i];
    if (!dueDateStr) continue;
    
    // Parse "DD-MM" format
    const [day, month] = dueDateStr.split("-").map(Number);
    
    // Determine year based on month
    let year = fyStart.getFullYear();
    if (month < 4) { // Jan-Mar belongs to next calendar year
      year = fyStart.getFullYear() + 1;
    }
    
    // Apply offset if any
    const totalMonths = (month - 1) + (offset_months || 0);
    const dueYear = year + Math.floor(totalMonths / 12);
    const dueMonth = totalMonths % 12;
    
    const dueDate = buildSafeDate(dueYear, dueMonth, day);
    
    if (dueDate >= fyStart && dueDate <= fyEnd) {
      dueDates.push(dueDate);
    }
  }
  
  console.log(`📅 Generated ${dueDates.length} quarterly due dates for ${template.name}`);
  return dueDates;
}

/**
 * Generate annual due date
 */
function generateAnnualDueDate(template, fyStart, fyEnd) {
  // Validate template has required config
  if (!template.recurrence_config || !template.recurrence_config.due_day || !template.recurrence_config.due_month) {
    console.warn(`⚠️ Template ${template.name} missing due_day/due_month in recurrence_config`);
    return [];
  }

  const { due_day, due_month, offset_months = 0 } = template.recurrence_config;
  
  // Determine base year
  let year = fyStart.getFullYear();
  if (due_month < 4) { // Jan-Mar belongs to next FY
    year = fyStart.getFullYear() + 1;
  }
  
  // Apply offset if any
  const totalMonths = (due_month - 1) + offset_months;
  const dueYear = year + Math.floor(totalMonths / 12);
  const dueMonth = totalMonths % 12;
  
  const dueDate = buildSafeDate(dueYear, dueMonth, due_day);
  
  if (dueDate >= fyStart && dueDate <= fyEnd) {
    console.log(`📅 Generated 1 annual due date for ${template.name}`);
    return [dueDate];
  }
  
  console.log(`📅 No annual due date for ${template.name} in this FY range`);
  return [];
}

export { 
  getFinancialYearDates, 
  buildSafeDate, 
  generateMonthlyDueDates, 
  generateQuarterlyDueDates, 
  generateAnnualDueDate 
};