import { getOrCreateZohoVendor } from "./zohoContactService.js";
import { pushExpenseToZoho } from "./zohoExpenseService.js";
import { resolveOrCreateZohoBillAccount } from "./zohoAccountService.js";
import * as zohoGst from "../utils/zohoGstState.js";

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractGstStateCode = (gstin) => {
  const cleaned = String(gstin || "").replace(/\s+/g, "").toUpperCase();
  const m = cleaned.match(/^(\d{2})[0-9A-Z]{13}$/);
  return m ? m[1] : undefined;
};

const inferTaxModeFromAmounts = (expenseData = {}) => {
  const cgst = Number(expenseData.cgst || 0);
  const sgst = Number(expenseData.sgst || 0);
  const igst = Number(expenseData.igst || 0);

  const hasIntra = cgst > 0 || sgst > 0;
  const hasInter = igst > 0;

  if (hasInter && !hasIntra) return "interstate";
  if (hasIntra && !hasInter) return "intrastate";
  return null;
};

const GST_STATE_CODE_TO_POS = {
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

const POS_TO_GST_STATE_CODE = Object.entries(GST_STATE_CODE_TO_POS).reduce((acc, [code, pos]) => {
  acc[pos] = code;
  return acc;
}, {});

const normalizePlaceOfSupply = (value) => {
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
    const padded = onlyGstCode[1].padStart(2, "0");
    return {
      alpha: GST_STATE_CODE_TO_POS[padded] || undefined,
      numeric: padded,
    };
  }

  const normalizedName = String(raw).toLowerCase().replace(/[^a-z]/g, "");
  const alpha = STATE_NAME_TO_POS[normalizedName] || undefined;
  return {
    alpha,
    numeric: alpha ? POS_TO_GST_STATE_CODE[alpha] : undefined,
  };
};

const toDateString = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

async function resolveOrganizationGstStateCode(zohoClient) {
  try {
    const data = await zohoClient.get("/organizations", { page: 1, per_page: 200 });
    const organizations = data?.organizations || [];
    const orgId = String(zohoClient?.organizationId || "");

    const matched =
      organizations.find((o) => String(o?.organization_id || "") === orgId) ||
      organizations.find((o) => o?.is_default_org) ||
      organizations[0];

    if (!matched) return undefined;
    return extractGstStateCode(matched?.gst_no || matched?.gstin || "");
  } catch {
    return undefined;
  }
}

async function resolveExpenseAccountId(zohoClient, preferredName) {
  const chart = await zohoClient.get("/chartofaccounts", {
    filter_by: "AccountType.Expense",
  });

  const accounts = chart?.chartofaccounts || [];
  if (!accounts.length) {
    throw new Error("No Zoho expense accounts found. Configure chart of accounts first.");
  }

  const preferred = normalizeText(preferredName);
  if (!preferred) {
    return accounts[0].account_id;
  }

  const matched = accounts.find((acc) => normalizeText(acc.account_name).includes(preferred));
  return (matched || accounts[0]).account_id;
}

async function resolveBillTaxId(zohoClient, expenseData, options = {}) {
  const mode = options?.mode || "auto"; // auto | interstate | intrastate
  const taxableAmount = Number(expenseData.taxable_amount || 0);
  const igst = Number(expenseData.igst || 0);
  const cgst = Number(expenseData.cgst || 0);
  const sgst = Number(expenseData.sgst || 0);
  const providedTotalGst = Number(expenseData.total_gst || 0);
  const intraAmount = cgst + sgst;

  const resolveEffectiveTotalGst = () => {
    // Common OCR issue: CGST, SGST and IGST all populated for the same bill.
    // In that case, `total_gst` is often double-counted and causes wrong GST slab selection.
    if (igst > 0 && intraAmount > 0) {
      const dominant = Math.max(igst, intraAmount);
      const looksDoubleCounted = providedTotalGst > dominant * 1.35;
      if (looksDoubleCounted || !(providedTotalGst > 0)) return dominant;
      return providedTotalGst;
    }

    if (mode === "interstate") {
      return igst > 0 ? igst : (providedTotalGst > 0 ? providedTotalGst : intraAmount);
    }

    if (mode === "intrastate") {
      return intraAmount > 0 ? intraAmount : (providedTotalGst > 0 ? providedTotalGst : igst);
    }

    return providedTotalGst > 0 ? providedTotalGst : (igst + intraAmount);
  };

  const totalGst = resolveEffectiveTotalGst();

  if (!(taxableAmount > 0) || !(totalGst > 0)) {
    return null;
  }

  const rateFromAmount = (amount) => {
    const n = Number(amount || 0);
    if (!(n > 0)) return null;
    const pct = (n / taxableAmount) * 100;
    if (!Number.isFinite(pct) || !(pct > 0)) return null;
    return Number(pct.toFixed(2));
  };

  const desiredRatesRaw =
    mode === "interstate"
      ? [rateFromAmount(totalGst), rateFromAmount(intraAmount), rateFromAmount(igst)]
      : mode === "intrastate"
        ? [rateFromAmount(totalGst), rateFromAmount(intraAmount), rateFromAmount(igst)]
        : [rateFromAmount(totalGst), rateFromAmount(intraAmount), rateFromAmount(igst)];

  const desiredRates = [...new Set(desiredRatesRaw.filter((r) => Number.isFinite(r) && r > 0))];
  if (!desiredRates.length) return null;

  let taxData;
  try {
    taxData = await zohoClient.get("/settings/taxes", {
      page: 1,
      per_page: 200,
    });
  } catch {
    return null;
  }

  const isInterstateTaxObject = (obj = {}) => {
    const hay = normalizeText(
      [obj?.tax_name, obj?.tax_group_name, obj?.tax_type, obj?.tax_type_name, obj?.tax_specific_type]
        .filter(Boolean)
        .join(" ")
    );
    return hay.includes("igst") || hay.includes("interstate") || hay.includes("inter state");
  };

  const isPurchaseTaxObject = (obj = {}) => {
    const source = normalizeText(
      [obj.tax_type, obj.tax_type_name, obj.tax_specific_type, obj.tax_name, obj.tax_group_name, obj.tax_authority_name]
        .filter(Boolean)
        .join(" ")
    );
    if (!source) return true;
    if (source.includes("purchase")) return true;
    if (source.includes("sales")) return false;
    return true;
  };

  const taxGroups = taxData?.tax_groups || [];
  const taxes = taxData?.taxes || [];

  const matchesMode = (obj = {}) => {
    if (mode === "interstate") return isInterstateTaxObject(obj);
    if (mode === "intrastate") return !isInterstateTaxObject(obj);
    return true;
  };

  const filteredGroups = taxGroups.filter((g) => g?.tax_group_id && matchesMode(g) && isPurchaseTaxObject(g));
  const filteredTaxes = taxes.filter((t) => t?.tax_id && matchesMode(t) && isPurchaseTaxObject(t));

  const modeOnlyGroups = taxGroups.filter((g) => g?.tax_group_id && matchesMode(g));
  const modeOnlyTaxes = taxes.filter((t) => t?.tax_id && matchesMode(t));

  const anyGroups = taxGroups.filter((g) => g?.tax_group_id);
  const anyTaxes = taxes.filter((t) => t?.tax_id);

  const buildSortedCandidates = (desiredRate, groups, items) => {
    const groupCandidates = groups
      .map((g) => ({
        id: g.tax_group_id,
        diff: Math.abs(Number(g.tax_group_percentage || 0) - desiredRate),
      }))
      .sort((a, b) => a.diff - b.diff);

    const taxCandidates = items
      .map((t) => ({
        id: t.tax_id,
        diff: Math.abs(Number(t.tax_percentage || 0) - desiredRate),
      }))
      .sort((a, b) => a.diff - b.diff);

    return { groupCandidates, taxCandidates };
  };

  const pickFromPools = (groups, items) => {
    // First pass: strict rate match.
    for (const desiredRate of desiredRates) {
      const { groupCandidates, taxCandidates } = buildSortedCandidates(desiredRate, groups, items);
      if (groupCandidates[0]?.diff <= 0.05) return groupCandidates[0].id;
      if (taxCandidates[0]?.diff <= 0.05) return taxCandidates[0].id;
    }

    // Second pass: nearest rate.
    for (const desiredRate of desiredRates) {
      const { groupCandidates, taxCandidates } = buildSortedCandidates(desiredRate, groups, items);
      if (groupCandidates[0]?.id) return groupCandidates[0].id;
      if (taxCandidates[0]?.id) return taxCandidates[0].id;
    }

    return null;
  };

  // Pool 1: mode + purchase
  const fromStrict = pickFromPools(filteredGroups, filteredTaxes);
  if (fromStrict) return fromStrict;

  // Pool 2: mode only (ignore purchase/sales label quality issues)
  const fromModeOnly = pickFromPools(modeOnlyGroups, modeOnlyTaxes);
  if (fromModeOnly) return fromModeOnly;

  // Pool 3: any tax object (last fallback)
  const fromAny = pickFromPools(anyGroups, anyTaxes);
  if (fromAny) return fromAny;

  return null;
}

const pickDefined = (obj = {}, keys = []) => {
  const out = {};
  keys.forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      out[key] = obj[key];
    }
  });
  return out;
};

export async function buildZohoBillPayload(zohoClient, billData) {
  const placeOfSupply = zohoGst.normalizePlaceOfSupply(billData.place_of_supply);
  const explicitSourceOfSupply = zohoGst.normalizePlaceOfSupply(billData.source_of_supply);
  const explicitDestinationOfSupply = zohoGst.normalizePlaceOfSupply(billData.destination_of_supply);
  const normalizedSourceOfSupply = explicitSourceOfSupply.alpha || undefined;
  const normalizedDestinationOfSupply = explicitDestinationOfSupply.alpha || undefined;
  const vendorTaxProfile = zohoGst.resolveVendorTaxProfile({
    gstin: billData.vendor_gstin || billData.gst_no,
    gstTreatment: billData.gst_treatment,
    city: billData.vendor_city,
    country: billData.vendor_country,
    vendorName: billData.vendor_name,
    gstReasoning: billData.gst_reasoning,
  });
  const gstNo = vendorTaxProfile.gstNo;

  const orgGstState = await zohoGst.resolveOrganizationGstStateCode(zohoClient);
  const vendorGstState = zohoGst.extractGstStateCode(gstNo);
  const sourceNumericState =
    explicitSourceOfSupply.numeric ||
    (!vendorTaxProfile.isOverseas ? (vendorGstState || placeOfSupply.numeric) : undefined);
  const destinationNumericState =
    explicitDestinationOfSupply.numeric ||
    orgGstState;
  const isInterstateByState = Boolean(
    sourceNumericState && destinationNumericState && sourceNumericState !== destinationNumericState
  );
  const amountBasedMode = inferTaxModeFromAmounts(billData);
  const taxMode =
    sourceNumericState && destinationNumericState
      ? (isInterstateByState ? "interstate" : "intrastate")
      : amountBasedMode || "auto";

  const sourceOfSupply = vendorTaxProfile.isOverseas
    ? (normalizedSourceOfSupply || undefined)
    : (
        normalizedSourceOfSupply ||
        (sourceNumericState && zohoGst.GST_STATE_CODE_TO_POS[sourceNumericState]) ||
        placeOfSupply.alpha ||
        undefined
      );
  const destinationOfSupply = vendorTaxProfile.isOverseas
    ? (normalizedDestinationOfSupply || undefined)
    : (
        normalizedDestinationOfSupply ||
        (destinationNumericState && zohoGst.GST_STATE_CODE_TO_POS[destinationNumericState]) ||
        undefined
      );

  const resolvedAccount = await resolveOrCreateZohoBillAccount(zohoClient, {
    expenseAccount: billData.expense_account,
    expenseAccountGroup: billData.expense_account_group,
    documentCategory: billData.document_category,
  });
  const accountId = resolvedAccount.accountId;
  const accountName = resolvedAccount.accountName;
  const taxId = await resolveBillTaxId(zohoClient, billData, { mode: taxMode });

  const taxableAmount = Number(billData.taxable_amount || 0);
  const grossAmount = Number(billData.total_with_gst || billData.taxable_amount || 0);
  const isInclusiveTax = billData.is_inclusive_tax ?? true;
  if (!(grossAmount > 0)) {
    throw new Error("Bill amount must be greater than zero");
  }

  const lineItems = Array.isArray(billData.line_items) && billData.line_items.length
    ? billData.line_items
    : [
        {
          account_id: accountId,
          name: String(accountName || billData.expense_account || "Imported Expense").trim(),
          description:
            billData.gst_reasoning ||
            `${billData.vendor_name || "Vendor"} - ${billData.invoice_number || "Bill"}`,
          quantity: 1,
          rate: isInclusiveTax ? grossAmount : (taxableAmount > 0 ? taxableAmount : grossAmount),
          ...(taxId ? { tax_id: taxId } : {}),
        },
      ];

  const payload = {
    vendor_id: billData.vendor_id,
    currency_id: billData.currency_id,
    vat_treatment: billData.vat_treatment,
    is_update_customer: billData.is_update_customer,
    purchaseorder_ids: billData.purchaseorder_ids,
    bill_number: billData.bill_number || billData.invoice_number,
    documents: billData.documents,
    source_of_supply: sourceOfSupply,
    destination_of_supply: destinationOfSupply,
    permit_number: billData.permit_number,
    gst_treatment: vendorTaxProfile.gstTreatment,
    tax_treatment: billData.tax_treatment,
    gst_no: gstNo || undefined,
    pricebook_id: billData.pricebook_id,
    reference_number: billData.reference_number || billData.invoice_number,
    date: toDateString(billData.date || billData.date_of_issue),
    due_date: toDateString(billData.due_date || billData.date || billData.date_of_issue),
    payment_terms: toFiniteNumber(billData.payment_terms),
    payment_terms_label: billData.payment_terms_label || "Due on Receipt",
    recurring_bill_id: billData.recurring_bill_id,
    exchange_rate: toFiniteNumber(billData.exchange_rate),
    is_item_level_tax_calc: billData.is_item_level_tax_calc,
    is_inclusive_tax: isInclusiveTax,
    adjustment: toFiniteNumber(billData.adjustment),
    adjustment_description: billData.adjustment_description,
    location_id: billData.location_id,
    custom_fields: billData.custom_fields,
    tags: billData.tags,
    line_items: lineItems,
    taxes: billData.taxes,
    notes: billData.notes || billData.gst_reasoning || "Imported via OCR",
    terms: billData.terms,
    approvers: billData.approvers,
  };

  return pickDefined(payload, [
    "vendor_id",
    "currency_id",
    "vat_treatment",
    "is_update_customer",
    "purchaseorder_ids",
    "bill_number",
    "documents",
    "source_of_supply",
    "destination_of_supply",
    "permit_number",
    "gst_treatment",
    "tax_treatment",
    "gst_no",
    "pricebook_id",
    "reference_number",
    "date",
    "due_date",
    "payment_terms",
    "payment_terms_label",
    "recurring_bill_id",
    "exchange_rate",
    "is_item_level_tax_calc",
    "is_inclusive_tax",
    "adjustment",
    "adjustment_description",
    "location_id",
    "custom_fields",
    "tags",
    "line_items",
    "taxes",
    "notes",
    "terms",
    "approvers",
  ]);
}

export const pushBillToZoho = async (zohoClient, bill) => {
  const vendorTaxProfile = zohoGst.resolveVendorTaxProfile({
    gstin: bill.vendor_gstin || bill.gst_no,
    gstTreatment: bill.gst_treatment,
    city: bill.vendor_city,
    country: bill.vendor_country,
    vendorName: bill.vendor_name || bill.vendor?.name || bill.vendor,
    gstReasoning: bill.gst_reasoning,
  });

  const vendorId = bill.vendor_id || (await getOrCreateZohoVendor(zohoClient, {
    name: bill.vendor_name || bill.vendor?.name || bill.vendor,
    gstin: bill.vendor_gstin,
    city: bill.vendor_city,
    country: bill.vendor_country,
    gst_treatment: bill.gst_treatment,
    gst_reasoning: bill.gst_reasoning,
  }));

  const payload = await buildZohoBillPayload(zohoClient, {
    ...bill,
    vendor_id: vendorId,
  });

  const idempotencyBaseKey = `bill-${bill.invoice_number || bill.bill_number || bill._id || Date.now()}`;

  try {
    return await zohoClient.post("/bills", payload, idempotencyBaseKey);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const interstateTaxError =
      message.includes("igst has to be applied") ||
      message.includes("interstate transaction");
    const invalidSupplyFields =
      message.includes("invalid element source_of_supply") ||
      message.includes("invalid element destination_of_supply");
    const invalidPos = message.includes("invalid element place_of_supply");

    if (!interstateTaxError && !invalidSupplyFields && !invalidPos) {
      throw error;
    }

    if (interstateTaxError) {
      console.warn("[ZOHO_BILL][IGST_MISMATCH]", {
        invoice_number: bill.invoice_number,
        vendor_gstin: bill.vendor_gstin,
        source_of_supply: payload.source_of_supply,
        destination_of_supply: payload.destination_of_supply,
        tax_id: payload.line_items?.[0]?.tax_id || null,
      });

      const interstateTaxId = await resolveBillTaxId(zohoClient, bill, { mode: "interstate" });
      const alignedInterstatePayload = {
        ...payload,
        ...(payload.source_of_supply ? { source_of_supply: payload.source_of_supply } : {}),
        ...(payload.destination_of_supply ? { destination_of_supply: payload.destination_of_supply } : {}),
      };

      const patched = {
        ...alignedInterstatePayload,
        line_items: (alignedInterstatePayload.line_items || []).map((item) => ({
          ...item,
          ...(interstateTaxId ? { tax_id: interstateTaxId } : {}),
        })),
      };

      delete patched.taxes;

      if (!interstateTaxId) {
        patched.line_items = (patched.line_items || []).map((item) => {
          const { tax_id, ...rest } = item;
          return rest;
        });
        delete patched.taxes;
      }

      try {
        return await zohoClient.post("/bills", patched, `${idempotencyBaseKey}-interstate`);
      } catch (retryError) {
        const retryMessage = String(retryError?.message || "").toLowerCase();
        const stillInterstateIssue =
          retryMessage.includes("igst has to be applied") ||
          retryMessage.includes("interstate transaction");

        if (!stillInterstateIssue) {
          throw retryError;
        }

        // Last resort to avoid hard failure when tax mapping is strict in Zoho org.
        // Convert to non-GST bill payload so creation never blocks on tax mapping.
        const minimal = {
          ...patched,
          line_items: (patched.line_items || []).map((item) => {
            const { tax_id, ...rest } = item;
            return rest;
          }),
          is_inclusive_tax: false,
          gst_treatment: vendorTaxProfile.isOverseas ? "overseas" : "business_none",
        };

        delete minimal.gst_no;
        delete minimal.tax_treatment;
        delete minimal.taxes;
        delete minimal.source_of_supply;
        delete minimal.destination_of_supply;

        try {
          return await zohoClient.post("/bills", minimal, `${idempotencyBaseKey}-minimal-nogst`);
        } catch (lastBillError) {
          const finalMessage = String(lastBillError?.message || "").toLowerCase();
          const stillInterstateHardFail =
            finalMessage.includes("igst has to be applied") ||
            finalMessage.includes("interstate transaction");

          if (!stillInterstateHardFail) {
            throw lastBillError;
          }

          // Ultimate fallback: create as expense so user flow is not blocked by strict bill GST constraints.
          return await pushExpenseToZoho(zohoClient, bill);
        }
      }
    }

    const withoutSupply = { ...payload };
    delete withoutSupply.source_of_supply;
    delete withoutSupply.destination_of_supply;

    return await zohoClient.post("/bills", withoutSupply, `${idempotencyBaseKey}-no-supply`);
  }
};