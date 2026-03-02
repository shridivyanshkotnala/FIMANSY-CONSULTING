function getFinancialYearDates(financialYear) {
  const [startYear, endYearSuffix] = financialYear.split("-");
  const start = new Date(Number(startYear), 3, 1); // April 1
  const end = new Date(Number("20" + endYearSuffix), 2, 31); // March 31
  return { start, end };
}



function buildSafeDate(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);
  if (date.getMonth() !== monthIndex) {
    return new Date(year, monthIndex + 1, 0); // last day of month
  }
  return date;
}


function generateMonthlyDueDates(template, fyStart, fyEnd) {
  const dueDates = [];
  const { due_day, offset_months } = template.recurrence_config;

  let current = new Date(fyStart);

  while (current <= fyEnd) {
    const dueMonth = current.getMonth() + offset_months;
    const dueYear =
      current.getMonth() + offset_months > 11
        ? current.getFullYear() + 1
        : current.getFullYear();

    const monthIndex = (dueMonth % 12 + 12) % 12;

    const dueDate = buildSafeDate(dueYear, monthIndex, due_day);

    if (dueDate >= fyStart && dueDate <= fyEnd) {
      dueDates.push(dueDate);
    }

    current.setMonth(current.getMonth() + 1);
  }

  return dueDates;
}


function generateQuarterlyDueDates(template, fyStart, fyEnd) {
  const dueDates = [];
  const { due_dates } = template.recurrence_config;

  for (const dateStr of due_dates) {
    const [day, month] = dateStr.split("-").map(Number);

    // Determine correct year
    let year = fyStart.getFullYear();
    if (month < 4) year = fyStart.getFullYear() + 1;

    const dueDate = buildSafeDate(year, month - 1, day);

    if (dueDate >= fyStart && dueDate <= fyEnd) {
      dueDates.push(dueDate);
    }
  }

  return dueDates;
}


function generateAnnualDueDate(template, fyStart, fyEnd) {
  const { due_day, due_month } = template.recurrence_config;

  let year = fyStart.getFullYear();
  if (due_month < 4) year = year + 1;

  const dueDate = buildSafeDate(year, due_month - 1, due_day);

  if (dueDate >= fyStart && dueDate <= fyEnd) {
    return [dueDate];
  }

  return [];
}

export { getFinancialYearDates, buildSafeDate, generateMonthlyDueDates, generateQuarterlyDueDates, generateAnnualDueDate };