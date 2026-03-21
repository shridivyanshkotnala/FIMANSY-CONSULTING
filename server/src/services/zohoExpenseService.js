const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

const normalizePlaceOfSupply = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;

  const directCode = raw.match(/^([A-Za-z]{2})$/);
  if (directCode) return directCode[1].toUpperCase();

  const gstCodeWithState = raw.match(/^(\d{1,2})\s*[- ]\s*([A-Za-z]{2})$/);
  if (gstCodeWithState) return gstCodeWithState[2].toUpperCase();

  const onlyGstCode = raw.match(/^(\d{1,2})$/);
  if (onlyGstCode) {
    const padded = onlyGstCode[1].padStart(2, "0");
    return GST_STATE_CODE_TO_POS[padded] || undefined;
  }

  const normalizedName = String(raw).toLowerCase().replace(/[^a-z]/g, "");
  return STATE_NAME_TO_POS[normalizedName] || undefined;
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

export async function pushExpenseToZoho(zohoClient, expenseData) {
  const accountId = await resolveExpenseAccountId(zohoClient, expenseData.expense_account);
  const paidThroughAccountId = await resolvePaidThroughAccountId(zohoClient, expenseData.payment_mode);

  const amount = Number(expenseData.total_with_gst || expenseData.taxable_amount || 0);
  if (!(amount > 0)) {
    throw new Error("Expense amount must be greater than zero");
  }

  const placeOfSupply = normalizePlaceOfSupply(expenseData.place_of_supply);
  const gstNo = String(expenseData.vendor_gstin || "").replace(/\s+/g, "").toUpperCase();

  const payload = {
    account_id: accountId,
    date: toDateString(expenseData.date_of_issue || expenseData.date),
    amount,
    description:
      expenseData.gst_reasoning ||
      `${expenseData.vendor_name || "Vendor"} - ${expenseData.invoice_number || "Expense"}`,
    reference_number: expenseData.invoice_number || undefined,
    is_inclusive_tax: true,
    ...(paidThroughAccountId ? { paid_through_account_id: paidThroughAccountId } : {}),
    ...(gstNo ? { gst_no: gstNo, gst_treatment: "business_gst" } : {}),
    ...(placeOfSupply ? { place_of_supply: placeOfSupply } : {}),
  };

  return await zohoClient.post(
    "/expenses",
    payload,
    `expense-${expenseData.invoice_number || Date.now()}`
  );
}
