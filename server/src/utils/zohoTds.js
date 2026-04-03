const TDS_PROFILES = [
  {
    key: "commission_brokerage",
    nature: "commission_brokerage",
    section: "194H",
    label: "Commission or Brokerage",
    rate: 5,
    singleBillThreshold: 20000,
    annualThreshold: 20000,
    thresholdLabel: "Rs 20,000 in a financial year",
    zohoPreferredNames: ["Commission or Brokerage", "194h", "commission", "brokerage"],
    matchKeywords: [
      "commission",
      "brokerage",
      "broker",
      "referral fee",
      "referral commission",
      "agency commission",
      "sales commission",
      "channel partner commission",
      "incentive payout",
    ],
    accountHints: [],
  },
  {
    key: "professional_fees",
    nature: "professional_fees",
    section: "194J",
    label: "Professional Fees",
    rate: 10,
    singleBillThreshold: 50000,
    annualThreshold: 50000,
    thresholdLabel: "Rs 50,000 in a financial year",
    zohoPreferredNames: ["Professional Fees", "194j", "professional"],
    matchKeywords: [
      "professional fee",
      "professional fees",
      "consultant",
      "consultancy",
      "consulting services",
      "legal fees",
      "advocate",
      "chartered accountant",
      "ca fees",
      "audit fee",
      "accounting services",
      "company secretary",
      "architect",
      "interior designer",
      "retainer fee",
      "advisory services",
    ],
    accountHints: ["Consultant Expense"],
  },
  {
    key: "technical_services",
    nature: "technical_services",
    section: "194J",
    label: "Technical Fees",
    rate: 2,
    singleBillThreshold: 50000,
    annualThreshold: 50000,
    thresholdLabel: "Rs 50,000 in a financial year",
    zohoPreferredNames: ["Technical Fees (2%)", "Technical Fees", "technical", "194j"],
    matchKeywords: [
      "technical fee",
      "technical fees",
      "technical service",
      "technical services",
      "technical consultancy",
      "technical consulting",
      "software development",
      "implementation service",
      "implementation charges",
      "system integration",
      "managed services",
      "it support",
      "technical support",
      "technology consulting",
      "development services",
    ],
    accountHints: [],
  },
  {
    key: "rent",
    nature: "rent",
    section: "194I",
    label: "Rent on land or furniture etc",
    rate: 10,
    singleBillThreshold: 50000,
    annualThreshold: 600000,
    thresholdLabel: "Rs 50,000 per month or Rs 6,00,000 in a financial year",
    zohoPreferredNames: ["Rent on land or furniture etc", "Rent on land or furniture", "rent", "194i"],
    matchKeywords: [
      "rent",
      "lease rent",
      "office rent",
      "warehouse rent",
      "shop rent",
      "premises rent",
      "rental",
      "tenancy",
      "license fee",
      "licence fee",
    ],
    accountHints: ["Rent Expense"],
  },
  {
    key: "contractor",
    nature: "contractor",
    section: "194C",
    label: "Payment of contractors for Others",
    rate: 2,
    singleBillThreshold: 30000,
    annualThreshold: 100000,
    thresholdLabel: "Rs 30,000 per bill or Rs 1,00,000 in a financial year",
    zohoPreferredNames: ["Payment of contractors for Others", "contractor", "194c"],
    matchKeywords: [
      "contractor",
      "sub contractor",
      "subcontractor",
      "job work",
      "works contract",
      "fabrication",
      "civil work",
      "construction",
      "renovation",
      "repair contract",
      "maintenance contract",
      "labour contract",
      "labor contract",
      "manpower supply",
      "outsourcing",
      "freight contract",
      "transport contract",
    ],
    accountHints: [
      "Subcontractor",
      "Labor",
      "Materials",
      "Repairs and Maintenance",
      "Transportation Expense",
      "Raw Materials And Consumables",
    ],
  },
  {
    key: "interest_other_than_securities",
    nature: "interest_other_than_securities",
    section: "194A",
    label: "Interest Other than Interest on Securities",
    rate: 10,
    singleBillThreshold: 10000,
    annualThreshold: 10000,
    thresholdLabel: "Rs 10,000 in a financial year for non-bank payers",
    zohoPreferredNames: ["Interest Other than Interest on Securities", "Other Interest than securities", "Other Interest than Securities", "194a", "interest"],
    matchKeywords: [
      "interest",
      "interest on loan",
      "loan interest",
      "interest charges",
      "finance interest",
      "delayed payment interest",
      "late payment interest",
    ],
    accountHints: [],
  },
];

const PROFILE_BY_KEY = Object.fromEntries(TDS_PROFILES.map((profile) => [profile.key, profile]));

const EXPLICIT_NATURE_MAP = {
  commission: "commission_brokerage",
  commision: "commission_brokerage",
  commission_brokerage: "commission_brokerage",
  brokerage: "commission_brokerage",
  commissionorbrokerage: "commission_brokerage",
  professional: "professional_fees",
  professional_fee: "professional_fees",
  professional_fees: "professional_fees",
  professionalfee: "professional_fees",
  professionalservices: "professional_fees",
  professionalandtechnicalservices: "technical_services",
  professionalfeesandtechnicalservices: "technical_services",
  technical: "technical_services",
  technical_fee: "technical_services",
  technical_fees: "technical_services",
  technical_services: "technical_services",
  technicalservice: "technical_services",
  rent: "rent",
  contractor: "contractor",
  contractors: "contractor",
  payment_to_contractor: "contractor",
  paymentofcontractor: "contractor",
  paymentofcontractors: "contractor",
  paymentofcontractorsforothers: "contractor",
  paymenttocontractor: "contractor",
  interest: "interest_other_than_securities",
  interestotherthaninterestonsecurities: "interest_other_than_securities",
  otherinterestthansecurities: "interest_other_than_securities",
  interestotherthansecurities: "interest_other_than_securities",
  interest_other_than_securities: "interest_other_than_securities",
  none: null,
  not_applicable: null,
  na: null,
};

export const normalizeTdsText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCompact = (value = "") => normalizeTdsText(value).replace(/ /g, "");

const toAmountNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const resolveExplicitNatureKey = (value = "") => {
  const compact = normalizeCompact(value);
  return Object.prototype.hasOwnProperty.call(EXPLICIT_NATURE_MAP, compact)
    ? EXPLICIT_NATURE_MAP[compact]
    : undefined;
};

const matchesAnyKeyword = (text, keywords = []) => {
  const normalized = normalizeTdsText(text);
  if (!normalized) return false;
  return keywords.some((keyword) => normalized.includes(normalizeTdsText(keyword)));
};

const scoreProfileMatch = (haystack, profile) => {
  const normalizedHaystack = normalizeTdsText(haystack);
  if (!normalizedHaystack) return 0;

  const keywordScore = (profile.matchKeywords || []).reduce((score, keyword) => (
    normalizedHaystack.includes(normalizeTdsText(keyword)) ? score + 2 : score
  ), 0);

  const accountHintScore = (profile.accountHints || []).reduce((score, hint) => (
    normalizedHaystack.includes(normalizeTdsText(hint)) ? score + 1 : score
  ), 0);

  return keywordScore + accountHintScore;
};

const detectHeuristicNatureKey = ({ expenseAccount, expenseAccountGroup, tdsReasoning, description, vendorName, tdsTaxName }) => {
  const haystacks = [expenseAccount, expenseAccountGroup, tdsReasoning, description, vendorName, tdsTaxName]
    .filter(Boolean)
    .map((value) => normalizeTdsText(value));

  if (!haystacks.length) return null;

  const priority = {
    commission_brokerage: 1,
    rent: 2,
    interest_other_than_securities: 3,
    technical_services: 4,
    professional_fees: 5,
    contractor: 6,
  };

  const scored = TDS_PROFILES
    .map((profile) => ({
      key: profile.key,
      score: haystacks.reduce((sum, haystack) => sum + scoreProfileMatch(haystack, profile), 0),
      priority: priority[profile.key] || 99,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.priority - right.priority;
    });

  return scored[0]?.key || null;
};

const looksLikeIndividualOrHufPayee = (text = "") => {
  const normalized = normalizeTdsText(text);
  if (!normalized) return false;

  return [
    "huf",
    "individual",
    "indiv",
    "proprietor",
    "proprietorship",
    "mr ",
    "mrs ",
    "ms ",
  ].some((token) => normalized.includes(token));
};

const buildThresholdDecision = (profile, amount, manualOverride = false) => {
  if (!profile) {
    return {
      isApplicable: false,
      amount,
      exceedsThreshold: false,
      thresholdLabel: null,
    };
  }

  const exceedsThreshold = amount >= profile.singleBillThreshold;
  return {
    isApplicable: manualOverride || exceedsThreshold,
    amount,
    exceedsThreshold,
    thresholdLabel: profile.thresholdLabel,
  };
};

const buildReasoning = ({ profile, thresholdDecision, baseReasoning, explicitNoTds }) => {
  if (explicitNoTds) {
    return baseReasoning || "No TDS detected for this bill.";
  }

  if (!profile) {
    return baseReasoning || "No matching TDS category detected from the bill nature.";
  }

  const thresholdLine = thresholdDecision.exceedsThreshold
    ? `The bill amount crosses the single-bill threshold used for auto-detection (${profile.thresholdLabel}).`
    : `The bill amount does not cross the single-bill threshold used for auto-detection (${profile.thresholdLabel}), so TDS is not auto-applied.`;

  return [
    baseReasoning || `${profile.label} falls under section ${profile.section} at ${profile.rate}% assuming PAN is available.`,
    thresholdLine,
    "Annual aggregate thresholds cannot be inferred from one invoice, so auto-detection is based on the current bill amount only unless manually overridden.",
  ]
    .filter(Boolean)
    .join(" ");
};

export const ZOHO_TDS_PROFILES = TDS_PROFILES.map((profile) => ({
  key: profile.key,
  nature: profile.nature,
  section: profile.section,
  label: profile.label,
  rate: profile.rate,
  singleBillThreshold: profile.singleBillThreshold,
  annualThreshold: profile.annualThreshold,
  thresholdLabel: profile.thresholdLabel,
  zohoPreferredNames: profile.zohoPreferredNames,
}));

export function resolveSuggestedBillTds({
  tdsNature,
  tdsReasoning,
  expenseAccount,
  expenseAccountGroup,
  taxableAmount,
  totalAmount,
  description,
  vendorName,
  tdsApplicable,
  tdsTaxName,
  tdsTaxId,
  manualOverride = false,
} = {}) {
  const explicitNatureKey = resolveExplicitNatureKey(tdsNature);
  const explicitNoTds = explicitNatureKey === null || normalizeCompact(tdsTaxName) === "notds";
  const amount = toAmountNumber(taxableAmount) > 0 ? toAmountNumber(taxableAmount) : toAmountNumber(totalAmount);

  const profileKey = explicitNoTds
    ? null
    : explicitNatureKey || detectHeuristicNatureKey({
        expenseAccount,
        expenseAccountGroup,
        tdsReasoning,
        description,
        vendorName,
        tdsTaxName,
      });
  const profile = profileKey ? PROFILE_BY_KEY[profileKey] : null;
  const contractorIndividualHint = profile?.key === "contractor" &&
    [vendorName, description, tdsReasoning, tdsTaxName]
      .filter(Boolean)
      .some((value) => looksLikeIndividualOrHufPayee(value));

  const effectiveRate = profile?.key === "contractor"
    ? (contractorIndividualHint ? 1 : 2)
    : (profile?.rate || null);

  const effectiveZohoNames = profile?.key === "contractor"
    ? (
        contractorIndividualHint
          ? ["Payment of contractors HUF/Indiv", "Payment of contractors HUF/Indiv (Reduced)"]
          : profile?.zohoPreferredNames || []
      )
    : (profile?.zohoPreferredNames || []);

  const thresholdDecision = buildThresholdDecision(profile, amount, manualOverride || Boolean(tdsTaxId));
  const isApplicable = explicitNoTds
    ? false
    : (typeof tdsApplicable === "boolean"
        ? (tdsApplicable && (thresholdDecision.isApplicable || manualOverride || Boolean(tdsTaxId)))
        : thresholdDecision.isApplicable);

  return {
    isTdsApplicable: Boolean(isApplicable && profile),
    tdsNature: profile?.nature || "none",
    tdsSection: profile?.section || null,
    tdsRate: effectiveRate,
    tdsThresholdLabel: profile?.thresholdLabel || null,
    tdsTaxName: effectiveZohoNames?.[0] || tdsTaxName || null,
    tdsTaxId: tdsTaxId || null,
    tdsReasoning: buildReasoning({
      profile,
      thresholdDecision,
      baseReasoning: tdsReasoning,
      explicitNoTds,
    }),
    candidateZohoNames: effectiveZohoNames,
    amountConsidered: amount,
  };
}

export const isTdsLikeZohoTax = (tax = {}) => {
  if (String(tax?.tax_type).toLowerCase() === 'tds' || String(tax?.type).toLowerCase() === 'tds') {
    return true;
  }

  const haystack = normalizeTdsText([
    tax?.tax_name,
    tax?.tax_group_name,
    tax?.label,
    tax?.name,
    tax?.tax_type,
    tax?.tax_type_name,
    tax?.tax_specific_type,
    tax?.description,
  ].filter(Boolean).join(" "));

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
    "194"
  ].some((token) => haystack.includes(token));
};

export const pickMatchingZohoTds = (entries = [], resolvedTds = {}) => {
  if (!resolvedTds?.isTdsApplicable) return null;

  const normalizedRequested = normalizeTdsText(resolvedTds.tdsTaxName);
  const requestedRate = Number(resolvedTds.tdsRate || 0);
  const candidates = entries.filter((entry) => isTdsLikeZohoTax(entry));

  const exact = candidates.find((entry) => {
    const entryName = normalizeTdsText(entry.tax_name || entry.tax_group_name || entry.name || entry.label);
    return entryName === normalizedRequested && Math.abs(Number(entry.tax_percentage || entry.percentage || 0) - requestedRate) <= 0.05;
  });
  if (exact) return exact;

  const preferredNames = (resolvedTds.candidateZohoNames || []).map(normalizeTdsText);
  const preferredWithRate = candidates.find((entry) => {
    const entryName = normalizeTdsText(entry.tax_name || entry.tax_group_name || entry.name || entry.label);
    const entryRate = Number(entry.tax_percentage || entry.percentage || 0);
    if (Math.abs(entryRate - requestedRate) > 0.05) return false;
    return preferredNames.some((name) => entryName.includes(name)) && !entryName.includes("reduced");
  });
  if (preferredWithRate) return preferredWithRate;

  const preferredWithoutRate = candidates.find((entry) => {
    const entryName = normalizeTdsText(entry.tax_name || entry.tax_group_name || entry.name || entry.label);
    return preferredNames.some((name) => entryName.includes(name)) && !entryName.includes("reduced");
  });
  if (preferredWithoutRate) return preferredWithoutRate;

  return candidates.find((entry) => {
    const entryName = normalizeTdsText(entry.tax_name || entry.tax_group_name || entry.name || entry.label);
    const entryRate = Number(entry.tax_percentage || entry.percentage || 0);
    return Math.abs(entryRate - requestedRate) <= 0.05 && !entryName.includes("reduced");
  }) || null;
};

export const buildTdsPromptText = () => `For TDS detection, classify the bill into exactly one of these tds_nature values: commission_brokerage, professional_fees, technical_services, rent, contractor, interest_other_than_securities, none.

Use these rules assuming the payee has PAN:
- commission_brokerage: Section 194H, 2%, use when the bill is for commission, brokerage, referral fee, or agent payout. Single-bill auto-threshold used by the app: Rs 20,000.
- professional_fees: Section 194J, 10%, use for consultancy, legal, audit, CA, company secretary, architecture, or other professional services. Single-bill auto-threshold used by the app: Rs 50,000.
- technical_services: Section 194J, 2%, use for technical services, implementation, IT support, software development services, or technical consulting. Single-bill auto-threshold used by the app: Rs 50,000.
- rent: Section 194I, 10%, use for rent/lease of land, building, furniture, fittings, office or warehouse. Single-bill auto-threshold used by the app: Rs 50,000.
- contractor: Section 194C, use when the bill is for contractor, subcontractor, manpower supply, labour contract, job work, fabrication, works contract, or similar contract work. Assuming PAN is available, 1% can apply for individual/HUF payees and 2% for others. If payee type is unclear, default to Others (2%). Single-bill auto-threshold used by the app: Rs 30,000.
- interest_other_than_securities: Section 194A, 10%, use for loan interest or other interest charges. Single-bill auto-threshold used by the app: Rs 10,000.
- none: use when no TDS category clearly applies.

Return a short tds_reasoning that explains why the chosen tds_nature fits the bill.`;
