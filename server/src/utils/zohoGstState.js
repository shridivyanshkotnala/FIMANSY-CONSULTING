export const GST_STATE_CODE_TO_POS = {
  "01": "JK",
  "02": "HP",
  "03": "PB",
  "04": "CH",
  "05": "UK",
  "06": "HR",
  "07": "DL",
  "08": "RJ",
  "09": "UP",
  "10": "BR",
  "11": "SK",
  "12": "AR",
  "13": "NL",
  "14": "MN",
  "15": "MZ",
  "16": "TR",
  "17": "ML",
  "18": "AS",
  "19": "WB",
  "20": "JH",
  "21": "OD",
  "22": "CG",
  "23": "MP",
  "24": "GJ",
  "26": "DN",
  "27": "MH",
  "29": "KA",
  "30": "GA",
  "31": "LD",
  "32": "KL",
  "33": "TN",
  "34": "PY",
  "35": "AN",
  "36": "TS",
  "37": "AP",
  "38": "LA",
};

const STATE_NAME_TO_POS = {
  andamanandnicobarislands: "AN",
  andhrapradesh: "AP",
  arunachalpradesh: "AR",
  assam: "AS",
  bihar: "BR",
  chandigarh: "CH",
  chhattisgarh: "CG",
  delhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  himachalpradesh: "HP",
  jammuandkashmir: "JK",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  madhyapradesh: "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  puducherry: "PY",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  tamilnadu: "TN",
  telangana: "TS",
  tripura: "TR",
  uttarpradesh: "UP",
  uttarakhand: "UK",
  westbengal: "WB",
  dadraandnagarhavelianddamananddiu: "DN",
};

export const POS_TO_GST_STATE_CODE = Object.entries(GST_STATE_CODE_TO_POS).reduce(
  (acc, [code, pos]) => {
    acc[pos] = code;
    return acc;
  },
  {}
);

const INDIAN_GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const COUNTRY_HINTS = [
  { country: "India", tokens: ["india", "bharat"] },
  { country: "Singapore", tokens: ["singapore"] },
  { country: "United States", tokens: ["unitedstates", "unitedstatesofamerica", "usa"] },
  { country: "United Kingdom", tokens: ["unitedkingdom", "greatbritain", "england", "britain"] },
  { country: "United Arab Emirates", tokens: ["unitedarabemirates", "uae", "dubai", "abudhabi"] },
  { country: "Canada", tokens: ["canada"] },
  { country: "Australia", tokens: ["australia"] },
  { country: "Germany", tokens: ["germany"] },
  { country: "France", tokens: ["france"] },
  { country: "Ireland", tokens: ["ireland"] },
  { country: "Netherlands", tokens: ["netherlands"] },
  { country: "Japan", tokens: ["japan"] },
  { country: "China", tokens: ["china"] },
  { country: "Hong Kong", tokens: ["hongkong"] },
  { country: "New Zealand", tokens: ["newzealand"] },
];

const OVERSEAS_REASON_TOKENS = [
  "nonresident",
  "nonresidentcompany",
  "overseas",
  "foreign",
  "outsideindia",
  "importofservice",
  "importofservices",
  "reversecharge",
];

const normalizeGeoText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();

export const normalizeIndianGstin = (gstin) => {
  const cleaned = String(gstin || "").replace(/\s+/g, "").toUpperCase();
  return INDIAN_GSTIN_REGEX.test(cleaned) ? cleaned : undefined;
};

export const detectCountryFromText = (value = "") => {
  const normalized = normalizeGeoText(value);
  if (!normalized) return undefined;

  const matched = COUNTRY_HINTS.find((entry) =>
    entry.tokens.some((token) => normalized.includes(token))
  );

  return matched?.country;
};

export const extractGstStateCode = (gstin) => {
  const cleaned = normalizeIndianGstin(gstin) || String(gstin || "").replace(/\s+/g, "").toUpperCase();
  const match = cleaned.match(/^(\d{2})[0-9A-Z]{13}$/);
  return match ? match[1] : undefined;
};

export const resolveVendorTaxProfile = ({
  gstin,
  gstTreatment,
  city,
  country,
  vendorName,
  gstReasoning,
} = {}) => {
  const gstNo = normalizeIndianGstin(gstin);
  const normalizedReasoning = normalizeGeoText(gstReasoning);
  const explicitCountry = detectCountryFromText(country);
  const cityCountry = detectCountryFromText(city);
  const nameCountry = detectCountryFromText(vendorName);
  const resolvedCountry = explicitCountry || cityCountry || nameCountry;
  const normalizedTreatment = String(gstTreatment || "").trim().toLowerCase();
  const reasoningSuggestsOverseas = OVERSEAS_REASON_TOKENS.some((token) =>
    normalizedReasoning.includes(token)
  );

  const isOverseas =
    normalizedTreatment === "overseas" ||
    (!gstNo && Boolean((resolvedCountry && resolvedCountry !== "India") || reasoningSuggestsOverseas));

  const effectiveGstTreatment = gstNo
    ? "business_gst"
    : isOverseas
      ? "overseas"
      : (["business_none", "consumer"].includes(normalizedTreatment)
          ? normalizedTreatment
          : "business_none");

  const gstStateCode = gstNo ? extractGstStateCode(gstNo) : undefined;

  return {
    gstNo,
    gstTreatment: effectiveGstTreatment,
    isOverseas,
    country: resolvedCountry || (isOverseas ? undefined : "India"),
    gstStateCode,
    placeOfContact: gstStateCode ? GST_STATE_CODE_TO_POS[gstStateCode] : undefined,
  };
};

export const normalizePlaceOfSupply = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { alpha: undefined, numeric: undefined };

  const directCode = raw.match(/^([A-Za-z]{2})$/);
  if (directCode) {
    const alpha = directCode[1].toUpperCase();
    return { alpha, numeric: POS_TO_GST_STATE_CODE[alpha] };
  }

  const gstCodeWithState = raw.match(/^(\d{1,2})\s*[- ]\s*([A-Za-z]{2})$/);
  if (gstCodeWithState) {
    const numeric = gstCodeWithState[1].padStart(2, "0");
    const alpha = gstCodeWithState[2].toUpperCase();
    return { alpha, numeric };
  }

  const onlyGstCode = raw.match(/^(\d{1,2})$/);
  if (onlyGstCode) {
    const numeric = onlyGstCode[1].padStart(2, "0");
    return {
      alpha: GST_STATE_CODE_TO_POS[numeric] || undefined,
      numeric,
    };
  }

  const normalizedName = raw.toLowerCase().replace(/[^a-z]/g, "");
  const alpha = STATE_NAME_TO_POS[normalizedName] || undefined;
  return {
    alpha,
    numeric: alpha ? POS_TO_GST_STATE_CODE[alpha] : undefined,
  };
};

const resolveStateCodeFromValue = (value) => normalizePlaceOfSupply(value).numeric;

export const resolveStateCodeFromRecord = (record = {}) => {
  if (!record || typeof record !== "object") return undefined;

  const gstState =
    extractGstStateCode(record.gst_no || record.gstin || record.gst_number || "") ||
    extractGstStateCode(record.tax_id_value || "");
  if (gstState) return gstState;

  const directCandidates = [
    record.state_code,
    record.gst_state_code,
    record.state,
    record.place_of_contact,
    record.place_of_supply,
    record.source_of_supply,
    record.destination_of_supply,
  ];

  for (const candidate of directCandidates) {
    const resolved = resolveStateCodeFromValue(candidate);
    if (resolved) return resolved;
  }

  const nestedCandidates = [record.address, record.billing_address, record.shipping_address];

  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== "object") continue;

    const resolved = resolveStateCodeFromRecord(candidate);
    if (resolved) return resolved;
  }

  return undefined;
};

export async function resolveOrganizationGstStateCode(zohoClient) {
  try {
    const data = await zohoClient.get("/organizations", { page: 1, per_page: 200 });
    const organizations = data?.organizations || [];
    const orgId = String(zohoClient?.organizationId || "");

    const matched =
      organizations.find((org) => String(org?.organization_id || "") === orgId) ||
      organizations.find((org) => org?.is_default_org) ||
      organizations[0];

    const fromList = resolveStateCodeFromRecord(matched);
    if (fromList) return fromList;

    const targetOrgId = String(matched?.organization_id || orgId || "").trim();
    if (!targetOrgId) return undefined;

    const detail = await zohoClient.get(`/organizations/${targetOrgId}`);
    return resolveStateCodeFromRecord(detail?.organization || detail || {});
  } catch {
    return undefined;
  }
}

export async function resolveOrganizationHasGstRegistration(zohoClient) {
  try {
    const data = await zohoClient.get("/organizations", { page: 1, per_page: 200 });
    const organizations = data?.organizations || [];
    const orgId = String(zohoClient?.organizationId || "");

    const matched =
      organizations.find((org) => String(org?.organization_id || "") === orgId) ||
      organizations.find((org) => org?.is_default_org) ||
      organizations[0];

    const listGst = normalizeIndianGstin(matched?.gst_no || matched?.gstin || "");
    if (listGst) return true;

    const targetOrgId = String(matched?.organization_id || orgId || "").trim();
    if (!targetOrgId) return false;

    const detail = await zohoClient.get(`/organizations/${targetOrgId}`);
    const org = detail?.organization || detail || {};
    return Boolean(normalizeIndianGstin(org?.gst_no || org?.gstin || ""));
  } catch {
    return false;
  }
}
