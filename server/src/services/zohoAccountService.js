import {
  normalizeAccountText,
  resolveSuggestedExpenseAccount,
} from "../utils/zohoExpenseAccountCatalog.js";

const BILL_ACCOUNT_TYPE_TOKENS = [
  "expense",
  "cost of goods sold",
  "cost_of_goods_sold",
  "depreciation",
  "employee benefit",
  "lease",
  "manufacturing",
  "other expense",
];

const isZohoBillAccount = (account = {}) => {
  const normalizedType = normalizeAccountText(account.account_type || account.account_type_name || "");
  const normalizedName = normalizeAccountText(account.account_name || "");

  if (BILL_ACCOUNT_TYPE_TOKENS.some((token) => normalizedType.includes(normalizeAccountText(token)))) {
    return true;
  }

  return normalizedName.includes("cost of goods sold") || normalizedName.includes("expense");
};

const pickChartAccountCollection = (data = {}) => data?.chartofaccounts || [];

async function listZohoAccounts(zohoClient) {
  const accounts = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const chart = await zohoClient.get("/chartofaccounts", {
      page,
      per_page: perPage,
      sort_column: "account_name",
    });

    const pageAccounts = pickChartAccountCollection(chart);
    accounts.push(...pageAccounts);

    const hasMore = Boolean(
      chart?.page_context?.has_more_page ||
      chart?.page_context?.has_more_records ||
      pageAccounts.length === perPage
    );

    if (!hasMore || pageAccounts.length === 0) {
      break;
    }

    page += 1;
  }

  return accounts;
}

const findBestAccountMatch = (accounts, preferredName) => {
  const normalizedPreferred = normalizeAccountText(preferredName);
  if (!normalizedPreferred) return null;

  const exact = accounts.find((account) => normalizeAccountText(account.account_name) === normalizedPreferred);
  if (exact) return exact;

  return accounts.find((account) => {
    const normalizedCandidate = normalizeAccountText(account.account_name);
    return normalizedCandidate.includes(normalizedPreferred) || normalizedPreferred.includes(normalizedCandidate);
  }) || null;
};

const extractCreatedAccount = (payload = {}) =>
  payload?.chartofaccount ||
  payload?.chart_of_account ||
  payload?.account ||
  payload?.chartofaccounts?.[0] ||
  payload?.chart_of_accounts?.[0] ||
  null;

export async function resolveOrCreateZohoBillAccount(zohoClient, accountInput = {}) {
  const suggestion = resolveSuggestedExpenseAccount(accountInput);
  const accounts = await listZohoAccounts(zohoClient);
  const eligibleAccounts = accounts.filter(isZohoBillAccount);

  const existing = findBestAccountMatch(eligibleAccounts, suggestion.accountName);
  if (existing?.account_id) {
    return {
      accountId: existing.account_id,
      accountName: existing.account_name,
      accountType: existing.account_type,
      created: false,
      suggestion,
    };
  }

  const createPayload = {
    account_name: suggestion.accountName,
    account_type: suggestion.zohoAccountType,
    description: `Auto-created from OCR bill classification (${suggestion.accountGroup}).`,
  };

  try {
    const createdResponse = await zohoClient.post(
      "/chartofaccounts",
      createPayload,
      `chart-account-${normalizeAccountText(suggestion.accountName).replace(/\s+/g, "-")}`
    );

    const created = extractCreatedAccount(createdResponse);
    if (created?.account_id) {
      return {
        accountId: created.account_id,
        accountName: created.account_name || suggestion.accountName,
        accountType: created.account_type || suggestion.zohoAccountType,
        created: true,
        suggestion,
      };
    }
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const duplicate =
      message.includes("already exists") ||
      message.includes("duplicate") ||
      message.includes("same name");

    if (!duplicate) {
      throw error;
    }
  }

  const refreshedAccounts = (await listZohoAccounts(zohoClient)).filter(isZohoBillAccount);
  const refreshedMatch = findBestAccountMatch(refreshedAccounts, suggestion.accountName);

  if (refreshedMatch?.account_id) {
    return {
      accountId: refreshedMatch.account_id,
      accountName: refreshedMatch.account_name,
      accountType: refreshedMatch.account_type,
      created: false,
      suggestion,
    };
  }

  throw new Error(`Unable to resolve or create Zoho account for ${suggestion.accountName}`);
}
