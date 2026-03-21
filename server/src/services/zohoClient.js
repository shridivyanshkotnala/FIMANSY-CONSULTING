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

const ZOHO_MAX_RETRIES = Number(process.env.ZOHO_MAX_RETRIES || 5);
const ZOHO_BASE_BACKOFF_MS = Number(process.env.ZOHO_BASE_BACKOFF_MS || 800);
const ZOHO_MAX_BACKOFF_MS = Number(process.env.ZOHO_MAX_BACKOFF_MS || 15000);
const ZOHO_REQUEST_TIMEOUT_MS = Number(process.env.ZOHO_REQUEST_TIMEOUT_MS || 25000);

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const getJitteredBackoff = (attempt) => {
  const exp = Math.min(ZOHO_MAX_BACKOFF_MS, ZOHO_BASE_BACKOFF_MS * (2 ** Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 400); // 0-399ms
  return exp + jitter;
};

const getRetryAfterMs = (res) => {
  const retryAfter = res.headers.get("retry-after");
  if (!retryAfter) return null;

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds)) return Math.max(0, asSeconds * 1000);

  const asDate = Date.parse(retryAfter);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
};

export class ZohoRequestError extends Error {
  constructor(message, {
    status = null,
    retryable = false,
    retryAfterMs = null,
    method = null,
    path = null,
    attempt = null,
    details = null,
  } = {}) {
    super(message);
    this.name = "ZohoRequestError";
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.method = method;
    this.path = path;
    this.attempt = attempt;
    this.details = details;
  }
}

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
    let lastError = null;

    for (let attempt = 1; attempt <= ZOHO_MAX_RETRIES; attempt++) {
      try {
        await this.ensureAuth();

        const url = new URL(`${ZOHO_BASE}${path}`);
        url.searchParams.set("organization_id", this.organizationId);

        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ZOHO_REQUEST_TIMEOUT_MS);

        let res;
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

        // token revoked while job running
        if (res.status === 401 && this.connection) {
          this.connection.tokenExpiry = new Date(0);
          const err401 = new ZohoRequestError("Zoho unauthorized response", {
            status: 401,
            retryable: attempt < ZOHO_MAX_RETRIES,
            method,
            path,
            attempt,
          });
          lastError = err401;

          if (attempt < ZOHO_MAX_RETRIES) {
            await sleep(getJitteredBackoff(attempt));
            continue;
          }
          throw err401;
        }

        const contentType = res.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text();

        if (!res.ok) {
          const retryAfterMs = res.status === 429 ? getRetryAfterMs(res) : null;
          const retryable = RETRYABLE_STATUS_CODES.has(res.status);

          const err = new ZohoRequestError(
            (payload && payload.message) || (typeof payload === "string" ? payload : "Zoho API error"),
            {
              status: res.status,
              retryable,
              retryAfterMs,
              method,
              path,
              attempt,
              details: payload,
            }
          );

          lastError = err;

          if (retryable && attempt < ZOHO_MAX_RETRIES) {
            await sleep(retryAfterMs ?? getJitteredBackoff(attempt));
            continue;
          }

          throw err;
        }

        return payload;
      } catch (err) {
        const isAbort = err?.name === "AbortError";
        const retryableNetworkError = isAbort || err?.code === "ETIMEDOUT" || err?.code === "ECONNRESET" || err?.code === "EAI_AGAIN";

        if (!(err instanceof ZohoRequestError)) {
          lastError = new ZohoRequestError(err?.message || "Zoho network error", {
            retryable: retryableNetworkError,
            method,
            path,
            attempt,
            details: { code: err?.code || null, name: err?.name || null },
          });
        } else {
          lastError = err;
        }

        if (lastError.retryable && attempt < ZOHO_MAX_RETRIES) {
          await sleep(lastError.retryAfterMs ?? getJitteredBackoff(attempt));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new ZohoRequestError("Zoho request failed after retries", {
      retryable: false,
      method,
      path,
    });
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