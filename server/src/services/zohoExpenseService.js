const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

export async function pushExpenseToZoho(zohoClient, expenseData) {
  const accountId = await resolveExpenseAccountId(zohoClient, expenseData.expense_account);

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
  };

  if (expenseData.vendor_gstin) {
    payload.gst_no = expenseData.vendor_gstin;
  }

  if (expenseData.place_of_supply) {
    payload.place_of_supply = expenseData.place_of_supply;
  }

  return await zohoClient.post(
    "/expenses",
    payload,
    `expense-${expenseData.invoice_number || Date.now()}`
  );
}
