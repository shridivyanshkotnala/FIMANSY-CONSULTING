const EXPENSE_ACCOUNT_DEFINITIONS = [
  {
    name: "Advertising And Marketing",
    group: "expense",
    zohoAccountType: "expense",
    aliases: [
      "advertising",
      "marketing",
      "marketing and advertising",
      "advertising and marketing",
      "digital marketing",
      "promotion",
      "promotional expense",
      "ad spend",
      "google ads",
      "meta ads",
      "facebook ads"
    ],
  },
  {
    name: "Automobile Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: [
      "automobile",
      "vehicle expense",
      "fuel",
      "petrol",
      "diesel",
      "car expense",
      "cab",
      "taxi",
      "uber",
      "ola"
    ],
  },
  {
    name: "Bad Debt",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["bad debt", "write off", "receivable write off"],
  },
  {
    name: "Bank Fees and Charges",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["bank fee", "bank fees", "bank charge", "transaction charge", "processing fee"],
  },
  {
    name: "Consultant Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["consultant", "consultancy", "professional service", "professional services", "retainer fee"],
  },
  {
    name: "Credit Card Charges",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["credit card charge", "card charge", "merchant fee", "gateway fee"],
  },
  {
    name: "Depreciation And Amortisation",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["depreciation and amortisation", "depreciation and amortization", "amortisation", "amortization"],
  },
  {
    name: "Depreciation Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["depreciation expense", "depreciation"],
  },
  {
    name: "IT and Internet Expenses",
    group: "expense",
    zohoAccountType: "expense",
    aliases: [
      "it and internet expenses",
      "it expense",
      "internet expense",
      "software",
      "software subscription",
      "saas",
      "hosting",
      "domain",
      "cloud",
      "wifi",
      "broadband"
    ],
  },
  {
    name: "Janitorial Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["janitorial", "cleaning", "housekeeping", "sanitation"],
  },
  {
    name: "Lodging",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["lodging", "hotel", "accommodation", "stay"],
  },
  {
    name: "Meals and Entertainment",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["meals", "entertainment", "food", "restaurant", "client dinner"],
  },
  {
    name: "Merchandise",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["merchandise", "trading goods", "resale goods"],
  },
  {
    name: "Office Supplies",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["office supplies", "office supply", "stationery", "consumables", "desk supplies"],
  },
  {
    name: "Other Expenses",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["other expenses", "miscellaneous", "misc", "general expense"],
  },
  {
    name: "Postage",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["postage", "courier", "shipping", "delivery", "dispatch"],
  },
  {
    name: "Printing and Stationery",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["printing and stationery", "printing", "stationery printing", "print job"],
  },
  {
    name: "Purchase Discounts",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["purchase discounts", "purchase discount", "vendor discount"],
  },
  {
    name: "Raw Materials And Consumables",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["raw material", "raw materials", "consumables", "consumable", "inputs", "components"],
  },
  {
    name: "Rent Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["rent", "rent expense", "lease rent", "office rent", "warehouse rent"],
  },
  {
    name: "Repairs and Maintenance",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["repairs and maintenance", "repair", "maintenance", "service charge", "servicing"],
  },
  {
    name: "Salaries and Employee Wages",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["salary", "salaries", "employee wages", "wages", "payroll", "staff salary"],
  },
  {
    name: "Telephone Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["telephone expense", "phone", "mobile", "telecom", "call charges"],
  },
  {
    name: "Transportation Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["transportation", "freight", "transport", "logistics", "carriage"],
  },
  {
    name: "Travel Expense",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["travel", "travel expense", "travel and conveyance", "conveyance", "airfare"],
  },
  {
    name: "Uncategorized",
    group: "expense",
    zohoAccountType: "expense",
    aliases: ["uncategorized", "unclassified"],
  },
];

const COGS_ACCOUNT_DEFINITIONS = [
  {
    name: "Cost of Goods Sold",
    group: "cost_of_goods_sold",
    zohoAccountType: "cost_of_goods_sold",
    aliases: ["cost of goods sold", "cogs", "cost of sales"],
  },
  {
    name: "Job Costing",
    group: "cost_of_goods_sold",
    zohoAccountType: "cost_of_goods_sold",
    aliases: ["job costing", "job cost", "job work"],
  },
  {
    name: "Labor",
    group: "cost_of_goods_sold",
    zohoAccountType: "cost_of_goods_sold",
    aliases: ["labor", "labour", "production labor", "production labour"],
  },
  {
    name: "Materials",
    group: "cost_of_goods_sold",
    zohoAccountType: "cost_of_goods_sold",
    aliases: ["materials", "material", "fabric", "steel", "wood", "packing material"],
  },
  {
    name: "Subcontractor",
    group: "cost_of_goods_sold",
    zohoAccountType: "cost_of_goods_sold",
    aliases: ["subcontractor", "sub contractor", "outsourcing", "job worker", "contract labour"],
  },
];

export const ZOHO_EXPENSE_ACCOUNT_GROUPS = {
  expense: EXPENSE_ACCOUNT_DEFINITIONS.map((entry) => entry.name),
  cost_of_goods_sold: COGS_ACCOUNT_DEFINITIONS.map((entry) => entry.name),
};

export const ZOHO_EXPENSE_ACCOUNT_CATALOG = [
  ...EXPENSE_ACCOUNT_DEFINITIONS,
  ...COGS_ACCOUNT_DEFINITIONS,
];

export const ZOHO_EXPENSE_ACCOUNT_NAMES = ZOHO_EXPENSE_ACCOUNT_CATALOG.map((entry) => entry.name);

export const normalizeAccountText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DEFAULT_ACCOUNT_BY_GROUP = {
  expense: "Other Expenses",
  cost_of_goods_sold: "Cost of Goods Sold",
};

const inferGroupFromText = (value = "") => {
  const normalized = normalizeAccountText(value);
  if (!normalized) return null;

  const costSignals = [
    "cost of goods",
    "cogs",
    "job work",
    "job costing",
    "subcontract",
    "labour",
    "labor",
    "materials"
  ];

  return costSignals.some((signal) => normalized.includes(signal))
    ? "cost_of_goods_sold"
    : "expense";
};

export const normalizeExpenseAccountGroup = (value, documentCategory) => {
  const normalized = normalizeAccountText(value);
  if (["cost of goods sold", "cost_of_goods_sold", "cogs"].includes(normalized)) {
    return "cost_of_goods_sold";
  }

  if (normalized === "expense") {
    return "expense";
  }

  if (["asset", "liability"].includes(String(documentCategory || "").toLowerCase())) {
    return "expense";
  }

  return inferGroupFromText(value) || "expense";
};

const titleCaseAccountName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "it") return "IT";
      if (lower === "and") return "And";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");

const GENERIC_FUZZY_ALIASES = new Set([
  "expense",
  "expenses",
  "general expense",
  "general expenses",
  "other expense",
  "other expenses",
  "misc",
  "miscellaneous",
  "uncategorized",
  "unclassified",
]);

export const findExpenseAccountCatalogEntry = (value = "") => {
  const normalized = normalizeAccountText(value);
  if (!normalized) return null;

  const exact = ZOHO_EXPENSE_ACCOUNT_CATALOG.find((entry) => {
    if (normalizeAccountText(entry.name) === normalized) return true;
    return (entry.aliases || []).some((alias) => normalizeAccountText(alias) === normalized);
  });
  if (exact) return exact;

  return ZOHO_EXPENSE_ACCOUNT_CATALOG.find((entry) =>
    (entry.aliases || []).some((alias) => {
      const normalizedAlias = normalizeAccountText(alias);
      if (!normalizedAlias || GENERIC_FUZZY_ALIASES.has(normalizedAlias)) return false;
      return normalized.includes(normalizedAlias);
    })
  ) || null;
};

export function resolveSuggestedExpenseAccount({
  expenseAccount,
  expenseAccountGroup,
  documentCategory,
} = {}) {
  const matched = findExpenseAccountCatalogEntry(expenseAccount);
  if (matched) {
    return {
      accountName: matched.name,
      accountGroup: matched.group,
      zohoAccountType: matched.zohoAccountType,
      isCatalogAccount: true,
    };
  }

  const normalizedGroup = normalizeExpenseAccountGroup(expenseAccountGroup, documentCategory);
  const raw = String(expenseAccount || "").trim();
  const cleanedName = titleCaseAccountName(raw);
  const normalizedRaw = normalizeAccountText(raw);

  if (!cleanedName || ["expense", "bill", "invoice", "category", "miscellaneous"].includes(normalizedRaw)) {
    const fallbackName = DEFAULT_ACCOUNT_BY_GROUP[normalizedGroup] || DEFAULT_ACCOUNT_BY_GROUP.expense;
    const fallbackEntry = findExpenseAccountCatalogEntry(fallbackName);
    return {
      accountName: fallbackName,
      accountGroup: normalizedGroup,
      zohoAccountType: fallbackEntry?.zohoAccountType || (normalizedGroup === "cost_of_goods_sold" ? "cost_of_goods_sold" : "expense"),
      isCatalogAccount: Boolean(fallbackEntry),
    };
  }

  return {
    accountName: cleanedName,
    accountGroup: normalizedGroup,
    zohoAccountType: normalizedGroup === "cost_of_goods_sold" ? "cost_of_goods_sold" : "expense",
    isCatalogAccount: false,
  };
}

export const buildExpenseAccountPromptText = () => {
  const expenseList = ZOHO_EXPENSE_ACCOUNT_GROUPS.expense.map((name) => `- ${name}`).join("\n");
  const cogsList = ZOHO_EXPENSE_ACCOUNT_GROUPS.cost_of_goods_sold.map((name) => `- ${name}`).join("\n");

  return `For expense_account, first try to classify the bill into one of these exact Zoho account names.\n\nExpense accounts:\n${expenseList}\n\nCost of goods sold accounts:\n${cogsList}\n\nRules for account classification:\n- If the bill clearly matches one of the above, return that exact account name in expense_account.\n- Also return expense_account_group as either \"expense\" or \"cost_of_goods_sold\".\n- Use cost_of_goods_sold only for direct production, resale, raw material, job work, subcontract, labor, or materials costs.\n- If the bill does not fit any listed account, create a short new account name that best describes the spend and still set expense_account_group.\n- Avoid generic labels unless the document truly gives no clue. Prefer a specific account name over Miscellaneous.`;
};
