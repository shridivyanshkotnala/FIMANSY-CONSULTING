const EXPENSE_ACCOUNTS = [
  "Advertising And Marketing",
  "Automobile Expense",
  "Bad Debt",
  "Bank Fees and Charges",
  "Consultant Expense",
  "Credit Card Charges",
  "Depreciation And Amortisation",
  "Depreciation Expense",
  "IT and Internet Expenses",
  "Janitorial Expense",
  "Lodging",
  "Meals and Entertainment",
  "Merchandise",
  "Office Supplies",
  "Other Expenses",
  "Postage",
  "Printing and Stationery",
  "Purchase Discounts",
  "Raw Materials And Consumables",
  "Rent Expense",
  "Repairs and Maintenance",
  "Salaries and Employee Wages",
  "Telephone Expense",
  "Transportation Expense",
  "Travel Expense",
  "Uncategorized",
];

const COGS_ACCOUNTS = [
  "Cost of Goods Sold",
  "Job Costing",
  "Labor",
  "Materials",
  "Subcontractor",
];

export const ZOHO_EXPENSE_ACCOUNT_GROUPS = {
  expense: EXPENSE_ACCOUNTS,
  cost_of_goods_sold: COGS_ACCOUNTS,
};

export const ZOHO_EXPENSE_ACCOUNT_NAMES = [...EXPENSE_ACCOUNTS, ...COGS_ACCOUNTS];

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function getZohoAccountGroupByName(accountName) {
  const normalized = normalize(accountName);
  if (!normalized) return null;
  if (EXPENSE_ACCOUNTS.some((name) => normalize(name) === normalized)) return "expense";
  if (COGS_ACCOUNTS.some((name) => normalize(name) === normalized)) return "cost_of_goods_sold";
  return null;
}

export function getZohoAccountSelectGroups(currentAccount) {
  const normalizedCurrent = normalize(currentAccount);
  const hasKnownCurrent = ZOHO_EXPENSE_ACCOUNT_NAMES.some((name) => normalize(name) === normalizedCurrent);

  const groups = [];

  if (currentAccount && !hasKnownCurrent) {
    groups.push({
      label: "Suggested / Custom",
      options: [currentAccount],
    });
  }

  groups.push(
    { label: "Expense", options: EXPENSE_ACCOUNTS },
    { label: "Cost Of Goods Sold", options: COGS_ACCOUNTS }
  );

  return groups;
}
