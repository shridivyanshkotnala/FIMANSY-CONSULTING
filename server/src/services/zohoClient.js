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

const ZOHO_BASE = "https://www.zohoapis.in/books/v3";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

    while (attempts < 4) {
      attempts++;

      await this.ensureAuth();


      const url = new URL(`${ZOHO_BASE}${path}`);
      url.searchParams.set("organization_id", this.organizationId);

      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          "Content-Type": "application/json",
          ...(idempotencyKey && { "X-Idempotency-Key": idempotencyKey }),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // token revoked while job running
      if (res.status === 401 && this.connection) {
        // force refresh next loop
        this.connection.tokenExpiry = new Date(0);
        continue;
      }

      // rate limit
      if (res.status === 429) {
        await sleep(1500 * attempts);
        continue;
      }

      // temporary server failure
      if (res.status >= 500) {
        await sleep(1000 * attempts);
        continue;
      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Zoho API error");

      return data;
    }

    throw new Error("Zoho request failed after retries");
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
      const data = await this.get(path, { ...params, page });

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