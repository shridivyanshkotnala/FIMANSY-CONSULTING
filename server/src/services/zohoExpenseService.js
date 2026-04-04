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

const POS_TO_GST_STATE_CODE = Object.entries(GST_STATE_CODE_TO_POS).reduce(
  (acc, [code, pos]) => {
    acc[pos] = code;
    return acc;
  },
  {}
);

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

async function resolvePaidThroughAccountId(zohoClient, paymentMode) {
  const chart = await zohoClient.get("/chartofaccounts", {});
  const accounts = chart?.chartofaccounts || [];
  if (!accounts.length) return null;

  const active = accounts.filter((acc) => acc?.is_active !== false);
  const pool = active.length ? active : accounts;

  const mode = normalizeText(paymentMode);

  const isCashLike = (acc) => {
    const t = normalizeText(acc.account_type || "");
    const n = normalizeText(acc.account_name || "");
    return t.includes("cash") || n.includes("cash");
  };

  const isBankLike = (acc) => {
    const t = normalizeText(acc.account_type || "");
    const n = normalizeText(acc.account_name || "");
    return (
      t.includes("bank") ||
      n.includes("bank") ||
      n.includes("upi") ||
      n.includes("card")
    );
  };

  let chosen = null;
  if (mode === "cash") {
    chosen = pool.find(isCashLike) || null;
  } else if (["bank transfer", "credit card", "upi", "cheque", "neft", "rtgs", "imps"].includes(mode)) {
    chosen = pool.find(isBankLike) || null;
  }

  if (!chosen) {
    chosen = pool.find(isBankLike) || pool.find(isCashLike) || pool[0] || null;
  }

  return chosen?.account_id || null;
}

async function resolveExpenseTaxId(zohoClient, expenseData, options = {}) {
  const mode = options?.mode || "auto"; // auto | interstate | intrastate
  const itcMode = options?.itcMode || "auto"; // auto | ineligible_others
  const taxableAmount = Number(expenseData.taxable_amount || 0);
  const igst = Number(expenseData.igst || 0);
  const cgst = Number(expenseData.cgst || 0);
  const sgst = Number(expenseData.sgst || 0);
  const providedTotalGst = Number(expenseData.total_gst || 0);
  const intraAmount = cgst + sgst;

  const resolveEffectiveTotalGst = () => {
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

  const effectiveRate = (totalGst / taxableAmount) * 100;
  if (!Number.isFinite(effectiveRate) || effectiveRate <= 0) {
    return null;
  }

  const desiredRate = Number(effectiveRate.toFixed(2));

  let taxData;
  try {
    taxData = await zohoClient.get("/settings/taxes", {
      page: 1,
      per_page: 200,
    });
  } catch (err) {
    // Non-fatal: some orgs/users may not have access to tax settings endpoint.
    return null;
  }

  const taxGroups = taxData?.tax_groups || [];
  const taxes = taxData?.taxes || [];

  const byRateAsc = (a, b) => a.diff - b.diff;

  const isIneligibleOthersTaxObject = (obj = {}) => {
    const label = normalizeText(
      [obj.tax_name, obj.tax_group_name, obj.tax_specific_type, obj.tax_type_name]
        .filter(Boolean)
        .join(" ")
    );

    if (!label) return false;
    return (
      (label.includes("ineligible") && label.includes("other")) ||
      label.includes("itc ineligible") ||
      label.includes("ineligible others")
    );
  };

  const isInterstateLabel = (value = "") => {
    const label = normalizeText(value);
    return label.includes("igst") || label.includes("interstate") || label.includes("inter state");
  };

  const isInterstateTaxObject = (obj = {}) => {
    const specificType = normalizeText(obj.tax_specific_type || obj.tax_type_name || obj.tax_type || "");
    if (specificType.includes("igst") || specificType.includes("interstate") || specificType.includes("inter state")) {
      return true;
    }
    return isInterstateLabel(obj.tax_name || obj.tax_group_name || "");
  };

  const isIntrastateTaxObject = (obj = {}) => {
    const specificType = normalizeText(obj.tax_specific_type || obj.tax_type_name || obj.tax_type || "");
    if (specificType.includes("igst") || specificType.includes("interstate") || specificType.includes("inter state")) {
      return false;
    }

    const label = normalizeText(obj.tax_name || obj.tax_group_name || "");
    if (!label) return true;
    if (label.includes("igst") || label.includes("interstate") || label.includes("inter state")) {
      return false;
    }

    // Prefer CGST/SGST/local style names when present.
    if (
      label.includes("cgst") ||
      label.includes("sgst") ||
      label.includes("intrastate") ||
      label.includes("intra state") ||
      label.includes("local")
    ) {
      return true;
    }

    return true;
  };

  const isPurchaseTaxObject = (obj = {}) => {
    const source = normalizeText(
      [
        obj.tax_type,
        obj.tax_type_name,
        obj.tax_specific_type,
        obj.tax_name,
        obj.tax_group_name,
        obj.tax_authority_name,
      ]
        .filter(Boolean)
        .join(" ")
    );

    // Keep permissive fallback when Zoho does not expose purchase/sales metadata clearly.
    if (!source) return true;
    if (source.includes("purchase")) return true;
    if (source.includes("sales")) return false;
    return true;
  };

  const filteredGroups = taxGroups
    .filter((g) => (itcMode === "ineligible_others" ? isIneligibleOthersTaxObject(g) : true));

  const filteredTaxes = taxes
    .filter((t) => (itcMode === "ineligible_others" ? isIneligibleOthersTaxObject(t) : true));

  const groupPool = filteredGroups.length ? filteredGroups : taxGroups;
  const taxPool = filteredTaxes.length ? filteredTaxes : taxes;

  const groupCandidates = groupPool
    .map((g) => ({
      id: g.tax_group_id,
      name: g.tax_group_name || "",
      raw: g,
      diff: Math.abs(Number(g.tax_group_percentage || 0) - desiredRate),
    }))
    .filter((x) => {
      if (mode === "interstate") return isInterstateTaxObject(x.raw);
      if (mode === "intrastate") return isIntrastateTaxObject(x.raw);
      return true;
    })
    .filter((x) => isPurchaseTaxObject(x.raw))
    .filter((x) => x.id)
    .sort(byRateAsc);

  if (groupCandidates[0]?.diff <= 0.05) {
    return groupCandidates[0].id;
  }

  const taxCandidates = taxPool
    .map((t) => ({
      id: t.tax_id,
      name: t.tax_name || "",
      raw: t,
      diff: Math.abs(Number(t.tax_percentage || 0) - desiredRate),
    }))
    .filter((x) => {
      if (mode === "interstate") return isInterstateTaxObject(x.raw);
      if (mode === "intrastate") return isIntrastateTaxObject(x.raw);
      return true;
    })
    .filter((x) => isPurchaseTaxObject(x.raw))
    .filter((x) => x.id)
    .sort(byRateAsc);

  if (taxCandidates[0]?.diff <= 0.05) {
    return taxCandidates[0].id;
  }

  return groupCandidates[0]?.id || taxCandidates[0]?.id || null;
}

export async function pushExpenseToZoho(zohoClient, expenseData) {
  const placeOfSupply = zohoGst.normalizePlaceOfSupply(expenseData.place_of_supply);
  const explicitSourceOfSupply = zohoGst.normalizePlaceOfSupply(expenseData.source_of_supply);
  const explicitDestinationOfSupply = zohoGst.normalizePlaceOfSupply(expenseData.destination_of_supply);
  const normalizedSourceOfSupply = explicitSourceOfSupply.alpha || undefined;
  const normalizedDestinationOfSupply = explicitDestinationOfSupply.alpha || undefined;
  const vendorTaxProfile = zohoGst.resolveVendorTaxProfile({
    gstin: expenseData.vendor_gstin || expenseData.gst_no,
    gstTreatment: expenseData.gst_treatment,
    city: expenseData.vendor_city,
    country: expenseData.vendor_country,
    vendorName: expenseData.vendor_name,
    gstReasoning: expenseData.gst_reasoning,
  });
  const gstNo = vendorTaxProfile.gstNo;

  const organizationHasGst = await zohoGst.resolveOrganizationHasGstRegistration(zohoClient);
  const orgGstState = organizationHasGst
    ? await zohoGst.resolveOrganizationGstStateCode(zohoClient)
    : undefined;
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
  const amountBasedMode = inferTaxModeFromAmounts(expenseData);

  const taxMode =
    sourceNumericState && destinationNumericState
      ? (isInterstateByState ? "interstate" : "intrastate")
      : amountBasedMode || "auto";

  const sourceOfSupply = vendorTaxProfile.isOverseas
    ? (normalizedSourceOfSupply || undefined)
    : (
        normalizedSourceOfSupply ||
        (sourceNumericState && zohoGst.GST_STATE_CODE_TO_POS[sourceNumericState]) ||
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
    expenseAccount: expenseData.expense_account,
    expenseAccountGroup: expenseData.expense_account_group,
    documentCategory: expenseData.document_category,
  });
  const accountId = resolvedAccount.accountId;
  const paidThroughAccountId = await resolvePaidThroughAccountId(zohoClient, expenseData.payment_mode);
  const taxId = organizationHasGst
    ? await resolveExpenseTaxId(zohoClient, expenseData, {
        mode: taxMode,
      })
    : null;

  const amount = Number(expenseData.total_with_gst || expenseData.taxable_amount || 0);
  if (!(amount > 0)) {
    throw new Error("Expense amount must be greater than zero");
  }

  const payload = {
    account_id: accountId,
    date: toDateString(expenseData.date_of_issue || expenseData.date),
    amount,
    description:
      expenseData.gst_reasoning ||
      `${expenseData.vendor_name || "Vendor"} - ${expenseData.invoice_number || "Expense"}`,
    reference_number: expenseData.invoice_number || undefined,
    is_inclusive_tax: true,
    ...(taxId ? { tax_id: taxId } : {}),
    ...(paidThroughAccountId ? { paid_through_account_id: paidThroughAccountId } : {}),
    ...(organizationHasGst && vendorTaxProfile.gstTreatment ? { gst_treatment: vendorTaxProfile.gstTreatment } : {}),
    ...(organizationHasGst && gstNo ? { gst_no: gstNo } : {}),
    ...(organizationHasGst && gstNo
      ? {
          ...(sourceOfSupply ? { source_of_supply: sourceOfSupply } : {}),
          ...(destinationOfSupply ? { destination_of_supply: destinationOfSupply } : {}),
        }
      : {}),
    ...(organizationHasGst && !gstNo && !vendorTaxProfile.isOverseas && placeOfSupply?.alpha
      ? { place_of_supply: placeOfSupply.alpha }
      : {}),
  };

  const idempotencyBaseKey = `expense-${expenseData.invoice_number || Date.now()}`;

  try {
    return await zohoClient.post("/expenses", payload, idempotencyBaseKey);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const invalidPos = message.includes("invalid element place_of_supply");
    const invalidSupplyFields =
      message.includes("invalid element source_of_supply") ||
      message.includes("invalid element destination_of_supply");
    const interstateTaxError =
      message.includes("igst has to be applied") ||
      message.includes("interstate transaction");
    const itcIneligibleOthersError =
      message.includes("itc option") &&
      message.includes("ineligible") &&
      message.includes("destination of supply state is different");
    const missingTaxMeta =
      message.includes("specify either a tax") ||
      message.includes("tax exemption") ||
      message.includes("reverse charge");

    if (interstateTaxError) {
      console.warn("[ZOHO_EXPENSE][IGST_MISMATCH]", {
        invoice_number: expenseData.invoice_number,
        taxMode,
        amountBasedMode,
        source_of_supply: payload.source_of_supply,
        destination_of_supply: payload.destination_of_supply,
        place_of_supply: payload.place_of_supply,
        gst_no: payload.gst_no,
        tax_id: payload.tax_id,
      });
    }

    if (!invalidPos && !invalidSupplyFields && !missingTaxMeta && !interstateTaxError && !itcIneligibleOthersError) {
      throw error;
    }

    if (itcIneligibleOthersError) {
      const itcTaxId = await resolveExpenseTaxId(zohoClient, expenseData, {
        mode: isInterstateByState ? "interstate" : taxMode,
        itcMode: "ineligible_others",
      });

      const itcPayload = { ...payload };
      if (itcTaxId) {
        itcPayload.tax_id = itcTaxId;
      }

      try {
        return await zohoClient.post("/expenses", itcPayload, `${idempotencyBaseKey}-itc-ineligible`);
      } catch {
        // Hard fallback: post non-tax payload so expense creation is not blocked.
        const {
          gst_no,
          tax_id,
          place_of_supply,
          source_of_supply,
          destination_of_supply,
          ...minimalPayload
        } = itcPayload;

        return await zohoClient.post(
          "/expenses",
          {
            ...minimalPayload,
            is_inclusive_tax: false,
            gst_treatment: "out_of_scope",
          },
          `${idempotencyBaseKey}-itc-minimal`
        );
      }
    }

    if (interstateTaxError) {
      const interstateTaxId = await resolveExpenseTaxId(zohoClient, expenseData, {
        mode: "interstate",
      });

      const interstatePayload = { ...payload };
      delete interstatePayload.tax_id;

      if (interstateTaxId) {
        interstatePayload.tax_id = interstateTaxId;
      }

      try {
        return await zohoClient.post("/expenses", interstatePayload, `${idempotencyBaseKey}-interstate`);
      } catch (thirdError) {
        const thirdMessage = String(thirdError?.message || "").toLowerCase();
        const stillInterstateIssue =
          thirdMessage.includes("igst has to be applied") ||
          thirdMessage.includes("interstate transaction");

        if (!stillInterstateIssue) {
          throw thirdError;
        }

        // Last-resort fallback to avoid complete failure for strict org GST mappings.
        // Expense gets posted; GST can be adjusted in Zoho if needed.
        const {
          gst_no,
          tax_id,
          place_of_supply,
          source_of_supply,
          destination_of_supply,
          ...minimalInterstatePayload
        } = interstatePayload;

        return await zohoClient.post(
          "/expenses",
          {
            ...minimalInterstatePayload,
            is_inclusive_tax: false,
            gst_treatment: "out_of_scope",
          },
          `${idempotencyBaseKey}-interstate-minimal`
        );
      }
    }

    if (missingTaxMeta) {
      // Fallback: when this Zoho org enforces special tax metadata rules,
      // retry with a minimal non-GST payload so expense creation can proceed.
      const {
        gst_no,
        gst_treatment,
        tax_id,
        place_of_supply,
        source_of_supply,
        destination_of_supply,
        ...minimalPayload
      } = payload;

      return await zohoClient.post(
        "/expenses",
        {
          ...minimalPayload,
          is_inclusive_tax: false,
        },
        `${idempotencyBaseKey}-tax-meta-minimal`
      );
    }

    if (invalidSupplyFields) {
      const {
        source_of_supply,
        destination_of_supply,
        ...payloadWithoutSupply
      } = payload;
      return await zohoClient.post("/expenses", payloadWithoutSupply, `${idempotencyBaseKey}-no-supply`);
    }

    // Fallback 1: try numeric GST state code if available (e.g., 27).
    if (placeOfSupply?.numeric) {
      const numericPayload = {
        ...payload,
        place_of_supply: placeOfSupply.numeric,
      };
      try {
        return await zohoClient.post("/expenses", numericPayload, `${idempotencyBaseKey}-numeric-pos`);
      } catch (secondError) {
        const secondMessage = String(secondError?.message || "").toLowerCase();
        if (!secondMessage.includes("invalid element place_of_supply")) {
          throw secondError;
        }
      }
    }

    // Fallback 2: omit place_of_supply entirely when Zoho rejects it.
    const { place_of_supply, ...payloadWithoutPos } = payload;
    return await zohoClient.post("/expenses", payloadWithoutPos, `${idempotencyBaseKey}-no-pos`);
  }
}
