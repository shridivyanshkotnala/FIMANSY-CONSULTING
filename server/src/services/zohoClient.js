// The real production problem

// What actually happens in real life:

// You send POST create invoice

// Zoho successfully creates invoice

// Network drops before response reaches you

// Your server thinks request failed

// Retry happens

// Second invoice created

// Now books are corrupted forever.

// This is the #1 integration bug in accounting SaaS.

// So we don’t avoid retry for POST —
// we make POST safe to retry.

// Solution → Idempotency Key

// We send a unique key per operation:

// X-Unique-Identifier: internal_invoice_id


// Zoho Books supports duplicate prevention via:

// reference_number

// custom_fields

// sometimes headers

// We will implement generic idempotency at client layer.

import { getValidZohoToken } from "./zohoTokenService.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { toZohoTime } from "../utils/zohoTime.js";

const ZOHO_BASE = "https://www.zohoapis.in/books/v3";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DEFAULT_TIMEOUT_MS = 30_000;

const parseRetryAfterMs = (retryAfterHeader, fallbackMs) => {
  if (!retryAfterHeader) return fallbackMs;

  const numeric = Number(retryAfterHeader);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.max(fallbackMs, numeric * 1000);
  }

  const retryDate = new Date(retryAfterHeader);
  if (!Number.isNaN(retryDate.getTime())) {
    return Math.max(fallbackMs, retryDate.getTime() - Date.now());
  }

  return fallbackMs;
};

const safeParseResponse = async (res) => {
  const raw = await res.text();
  if (!raw) return { data: null, raw: "" };

  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
};

export class ZohoClient {
  constructor({ accessToken = null, organizationId = null, connection = null }) {
    this.accessToken = accessToken;
    this.organizationId = organizationId;
    this.connection = connection; // background worker mode
  }

  // ensures token valid (only used in scheduler mode)
  async ensureAuth() {
    if (this.connection) {
      const token = await getValidZohoToken(this.connection);
      this.accessToken = token;
      this.organizationId = this.connection.zohoOrgId;
    }
  }

  async request(method, path, { params = {}, body = null, idempotencyKey = null } = {}) {
    let attempts = 0;
    let lastError = null;
    let unauthorizedCount = 0;

    while (attempts < 4) {
      attempts++;

      await this.ensureAuth();


      const url = new URL(`${ZOHO_BASE}${path}`);
      url.searchParams.set("organization_id", this.organizationId);

      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });

      let res;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

        try {
          res = await fetch(url, {
            method,
            headers: {
              Authorization: `Zoho-oauthtoken ${this.accessToken}`,
              "Content-Type": "application/json",
              ...(idempotencyKey && { "X-Idempotency-Key": idempotencyKey }),
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      } catch (networkErr) {
        lastError = networkErr;
        const delay = 1000 * attempts;
        await sleep(delay);
        continue;
      }

      // token revoked while job running
      if (res.status === 401 && this.connection) {
        unauthorizedCount += 1;

        if (unauthorizedCount >= 2) {
          this.connection.status = "expired";
          await this.connection.save();

          throw new Error("Zoho authorization expired or revoked. Please reconnect Zoho integration.");
        }

        // force refresh next loop
        this.connection.tokenExpiry = new Date(0);
        continue;
      }

      unauthorizedCount = 0;

      // rate limit
      if (res.status === 429) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"), 1500 * attempts);
        await sleep(retryAfterMs);
        continue;
      }

      // temporary server failure
      if (res.status >= 500) {
        await sleep(1000 * attempts);
        continue;
      }

      const { data, raw } = await safeParseResponse(res);

      if (!res.ok) {
        const messageFromBody =
          data?.message ||
          data?.error?.message ||
          data?.error ||
          (raw ? raw.slice(0, 300) : "");

        throw new Error(`Zoho API ${res.status}: ${messageFromBody || "Request failed"}`);
      }

      return data;
    }

    const message = lastError?.message || "Zoho request failed after retries";
    throw new Error(`Zoho request failed after retries: ${message}`);
  }

  get(path, params) {
    return this.request("GET", path, { params });
  }

  post(path, body, idempotencyKey) {
    return this.request("POST", path, { body, idempotencyKey });
  }

  put(path, body) {
    return this.request("PUT", path, { body });
  }

  delete(path) {
    return this.request("DELETE", path);
  }


  // ---------- NEW: Pagination helper (scheduler only) ----------
  async paginate(path, params, arrayKey) {
    let page = 1;
    let all = [];
    let lastModified = null;

    while (true) {
      // Pass last_modified_time through as-is — Zoho returns timestamps in a format
      // it already accepts, so no conversion is needed. If the stored cursor is from
      // the old broken code (no timezone suffix), drop it and do a full resync
      // instead of looping forever with an invalid value.
      const safeParams = { ...params };
      if (safeParams.last_modified_time) {
        const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(safeParams.last_modified_time);
        if (!hasTimezone) {
          console.warn(`[ZOHO] Dropping invalid cursor (no timezone): ${safeParams.last_modified_time} — falling back to full sync`);
          delete safeParams.last_modified_time;
        }
      }

      const data = await this.get(path, { ...safeParams, page });

      const records = data[arrayKey] || [];
      if (!records.length) break;

      all.push(...records);

      const last = records[records.length - 1];
      if (last?.last_modified_time) lastModified = last.last_modified_time;

      if (!data.page_context?.has_more_page) break;

      page++;
    }

    return { records: all, lastModified };
  }



}


/*
Step 2 — How you safely retry POST

Now you NEVER call post without a stable key.

Example internal invoice id:

invoice._id = 65f81a2c9

Controller usage
await req.zohoClient.post(
  "/invoices",
  {
    customer_id: customer.zohoId,
    line_items: items
  },
  `invoice-${invoice._id}`
);


Now:

If network fails → retry
Zoho receives same key → ignores duplicate

No double invoices.

When retry actually triggers
Scenario	What happens
Zoho rate limit	auto retry
Zoho temporary outage	auto retry
Internet hiccup	safe retry
Server restart mid request	safe retry
User spam clicks	safe retry

Without idempotency → financial disaster
With idempotency → invisible recovery

So answering your question

Only GET needs retry?

No — in accounting systems:

POST needs retry MORE than GET
but only AFTER making it idempotent
*/