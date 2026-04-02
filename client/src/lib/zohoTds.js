const TDS_CATEGORY_RULES = [
  {
    nature: "commission_brokerage",
    label: "Commission / Brokerage",
    keywords: ["commission", "brokerage", "broker"],
  },
  {
    nature: "professional_fees",
    label: "Professional Fees",
    keywords: ["professional fees", "professional fee", "professional", "consultancy", "consultant"],
  },
  {
    nature: "technical_services",
    label: "Technical Fees",
    keywords: ["technical fees", "technical fee", "technical services", "technical service", "technical"],
  },
  {
    nature: "rent",
    label: "Rent",
    keywords: ["rent on land", "rent on furniture", "rent"],
  },
  {
    nature: "contractor",
    label: "Contractor Payments",
    keywords: ["payment of contractors", "contractors", "contractor"],
  },
  {
    nature: "interest_other_than_securities",
    label: "Interest",
    keywords: ["interest other than securities", "interest"],
  },
];

export const NO_TDS_SELECT_VALUE = "__none__";

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isReducedOption = (value = "") => normalize(value).includes("reduced");

export const isZohoTdsOption = (option = {}) => {
  const haystack = normalize([option?.name, option?.label].filter(Boolean).join(" "));
  if (!haystack) return false;

  return [
    "commission",
    "brokerage",
    "professional",
    "technical",
    "rent",
    "contractor",
    "interest",
    "tds",
  ].some((token) => haystack.includes(token));
};

export const inferTdsNatureFromLabel = (value = "") => {
  const haystack = normalize(value);
  if (!haystack) return null;

  const matchedRule = TDS_CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => haystack.includes(normalize(keyword)))
  );

  return matchedRule?.nature || null;
};

const buildOption = (option = {}) => ({
  value: String(option.id),
  id: String(option.id),
  name: option.name || option.label || "",
  label: option.label || option.name || "",
  percentage: Number(option.percentage || 0),
  nature: inferTdsNatureFromLabel(option.name || option.label || ""),
  isReduced: isReducedOption(option.name || option.label || ""),
});

export const getZohoTdsSelectGroups = (taxes = [], currentTaxName = "") => {
  const apiOptions = (taxes || [])
    .filter(isZohoTdsOption)
    .map(buildOption)
    .sort((left, right) => {
      if (left.nature === right.nature) {
        if (left.isReduced !== right.isReduced) return left.isReduced ? 1 : -1;
        return left.label.localeCompare(right.label);
      }
      return left.label.localeCompare(right.label);
    });

  const groups = [
    {
      label: "TDS",
      options: [
        {
          value: NO_TDS_SELECT_VALUE,
          id: null,
          name: "No TDS",
          label: "No TDS",
          percentage: 0,
          nature: "none",
          isReduced: false,
        },
      ],
    },
  ];

  const normalizedCurrent = normalize(currentTaxName);
  const currentExists = apiOptions.some((option) => normalize(option.name) === normalizedCurrent);

  if (currentTaxName && !currentExists) {
    groups.push({
      label: "Suggested / Current",
      options: [
        {
          value: `__suggested__:${currentTaxName}`,
          id: null,
          name: currentTaxName,
          label: currentTaxName,
          percentage: 0,
          nature: inferTdsNatureFromLabel(currentTaxName),
          isReduced: isReducedOption(currentTaxName),
        },
      ],
    });
  }

  TDS_CATEGORY_RULES.forEach((rule) => {
    const ruleOptions = apiOptions.filter((option) => option.nature === rule.nature);
    if (ruleOptions.length) {
      groups.push({
        label: rule.label,
        options: ruleOptions,
      });
    }
  });

  const uncategorized = apiOptions.filter((option) => !option.nature);
  if (uncategorized.length) {
    groups.push({
      label: "Other TDS",
      options: uncategorized,
    });
  }

  return groups;
};

export const getZohoTdsOptionByValue = (groups = [], value = "") =>
  groups.flatMap((group) => group.options).find((option) => option.value === value) || null;

export const findMatchingZohoTdsOption = (taxes = [], { tdsTaxId, tdsTaxName, tdsRate } = {}) => {
  const groups = getZohoTdsSelectGroups(taxes, tdsTaxName);
  const options = groups.flatMap((group) => group.options).filter((option) => option.value !== NO_TDS_SELECT_VALUE);

  if (tdsTaxId) {
    const exactId = options.find((option) => option.id === String(tdsTaxId));
    if (exactId) return exactId;
  }

  const normalizedName = normalize(tdsTaxName);
  if (normalizedName) {
    const exactName = options.find((option) => normalize(option.name) === normalizedName);
    if (exactName) return exactName;
  }

  const numericRate = Number(tdsRate || 0);
  const desiredNature = inferTdsNatureFromLabel(tdsTaxName);
  if (Number.isFinite(numericRate) && numericRate > 0) {
    const byRate = options.find((option) => {
      if (Math.abs(Number(option.percentage || 0) - numericRate) > 0.05) return false;
      if (desiredNature && option.nature && option.nature !== desiredNature) return false;
      return !option.isReduced;
    });
    if (byRate) return byRate;
  }

  if (tdsTaxName) {
    return {
      value: `__suggested__:${tdsTaxName}`,
      id: null,
      name: tdsTaxName,
      label: tdsTaxName,
      percentage: Number(tdsRate || 0),
      nature: desiredNature,
      isReduced: isReducedOption(tdsTaxName),
    };
  }

  return null;
};
