import { pushInvoiceToZoho } from "../services/zohoInvoiceService.js";
import { pushBillToZoho } from "../services/zohoBillService.js";
import { getOrCreateZohoItem } from "../services/zohoItemService.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "../services/r2Client.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
// export const syncInvoiceToZoho = async (req, res) => {

//   const invoice = req.body; // later from DB

//   const result = await pushInvoiceToZoho(req.zohoClient, invoice);

//   res.json({
//     message: "Invoice pushed to Zoho",
//     zohoInvoiceId: result.invoice.invoice_id,
//   });
// };

export const syncInvoiceToZoho = asynchandler(async (req, res) => {

  const invoice = req.body.invoice;
  if (!invoice) {
    return res.status(400).json({ success: false, message: "invoice payload is required" });
  }

  const category = String(invoice.document_category || "").trim().toLowerCase();
  const isExpenseLike = category === "expense" || category === "asset" || category === "liability";

  let result;
  if (isExpenseLike) {
    result = await pushBillToZoho(req.zoho, invoice);
  } else {
    result = await pushInvoiceToZoho(req.zoho, invoice);
  }

  const sourceFileUrl = invoice.source_file || invoice.pdf_url || null;
  const deletedSourceFile = await deleteR2FileIfPresent(sourceFileUrl);

  res.json({
    success: true,
    zohoInvoiceId: result.invoice_id || result.bill?.bill_id || result.bill_id,
    zohoBillId: result.bill?.bill_id || result.bill_id || null,
    zohoExpenseId: result.expense?.expense_id || result.expense_id || null,
    deletedSourceFile,
  });
});

export const listZohoCustomers = asynchandler(async (req, res) => {
  const search = String(req.query?.search || "").trim().toLowerCase();
  const data = await req.zoho.get("/contacts", {
    contact_type: "customer",
    page: 1,
    per_page: 200,
  });

  const contacts = (data?.contacts || []).map((c) => ({
    id: c.contact_id,
    name: c.contact_name,
    email: c.email || "",
    phone: c.phone || c.mobile || "",
  }));

  const filtered = search
    ? contacts.filter((c) => String(c.name || "").toLowerCase().includes(search))
    : contacts;

  res.json({ success: true, customers: filtered });
});

export const createZohoCustomer = asynchandler(async (req, res) => {
  const {
    displayName,
    email,
    phone,
    billingAddress,
    shippingAddress,
    shippingSameAsBilling,
  } = req.body || {};

  const contactName = String(displayName || "").trim();
  if (!contactName) {
    throw new ApiError(400, "displayName is required");
  }

  const cleanAddress = (addr) => {
    if (!addr || typeof addr !== "object") return null;
    const out = {
      attention: String(addr.attention || "").trim(),
      address: String(addr.address || "").trim(),
      street2: String(addr.street2 || "").trim(),
      city: String(addr.city || "").trim(),
      state: String(addr.state || "").trim(),
      zip: String(addr.pincode || addr.zip || "").trim(),
      country: "India",
      phone: String(addr.phone || "").trim(),
    };

    const hasMeaningful =
      out.attention || out.address || out.street2 || out.city || out.state || out.zip || out.phone;
    return hasMeaningful ? out : null;
  };

  const billing = cleanAddress(billingAddress);
  const shipping = shippingSameAsBilling ? billing : cleanAddress(shippingAddress);

  const payload = {
    contact_name: contactName,
    company_name: contactName,
    contact_type: "customer",
    ...(email ? { email: String(email).trim() } : {}),
    ...(phone ? { phone: String(phone).trim(), mobile: String(phone).trim() } : {}),
    ...(billing ? { billing_address: billing } : {}),
    ...(shipping ? { shipping_address: shipping } : {}),
  };

  const created = await req.zoho.post("/contacts", payload, `customer-${contactName}`);
  const contact = created?.contact || {};

  res.status(201).json({
    success: true,
    customer: {
      id: contact.contact_id,
      name: contact.contact_name,
      email: contact.email || "",
      phone: contact.phone || contact.mobile || "",
    },
  });
});

export const listZohoTaxes = asynchandler(async (req, res) => {
  const data = await req.zoho.get("/settings/taxes", { page: 1, per_page: 200 });
  const taxes = (data?.taxes || []).map((t) => ({
    id: t.tax_id,
    name: t.tax_name,
    percentage: Number(t.tax_percentage || 0),
    type: "tax",
    label: `${t.tax_name} [${Number(t.tax_percentage || 0)}%]`,
  }));

  const groups = (data?.tax_groups || []).map((g) => ({
    id: g.tax_group_id,
    name: g.tax_group_name,
    percentage: Number(g.tax_group_percentage || 0),
    type: "tax_group",
    label: `${g.tax_group_name} [${Number(g.tax_group_percentage || 0)}%]`,
  }));

  res.json({ success: true, taxes: [...taxes, ...groups] });
});

export const createSalesInvoiceInZoho = asynchandler(async (req, res) => {
  const {
    customerId,
    placeOfSupply,
    invoiceType,
    invoiceDate,
    subject,
    lineItems,
  } = req.body || {};

  const normalizedInvoiceType = String(invoiceType || "gst").trim().toLowerCase();
  const isGstInvoice = normalizedInvoiceType !== "non_gst";

  if (!customerId) throw new ApiError(400, "customerId is required");
  if (isGstInvoice && !placeOfSupply) throw new ApiError(400, "placeOfSupply is required for GST invoice");
  if (!invoiceDate) throw new ApiError(400, "invoiceDate is required");
  if (!Array.isArray(lineItems) || !lineItems.length) {
    throw new ApiError(400, "At least one line item is required");
  }

  const specialTaxLabels = {
    "special:non-taxable": "Non-Taxable",
    "special:out-of-scope": "Out of Scope",
    "special:non-gst-supply": "Non-GST Supply",
  };

  const specialTaxMatchTokens = {
    "special:non-taxable": ["non", "taxable"],
    "special:out-of-scope": ["out", "scope"],
    "special:non-gst-supply": ["non", "gst", "supply"],
  };

  const presetTaxToName = {
    "preset:GST0": "GST0",
    "preset:GST5": "GST5",
    "preset:GST12": "GST12",
    "preset:GST18": "GST18",
    "preset:GST28": "GST28",
    "preset:GST40": "GST40",
  };

  let zohoTaxesCache = null;

  const extractGstStateCode = (gstin) => {
    const cleaned = String(gstin || "").replace(/\s+/g, "").toUpperCase();
    const m = cleaned.match(/^(\d{2})[0-9A-Z]{13}$/);
    return m ? m[1] : undefined;
  };

  const GST_STATE_CODE_TO_POS = {
    "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK", "06": "HR", "07": "DL", "08": "RJ",
    "09": "UP", "10": "BR", "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ", "16": "TR",
    "17": "ML", "18": "AS", "19": "WB", "20": "JH", "21": "OD", "22": "CG", "23": "MP", "24": "GJ",
    "26": "DN", "27": "MH", "29": "KA", "30": "GA", "31": "LD", "32": "KL", "33": "TN", "34": "PY",
    "35": "AN", "36": "TS", "37": "AP", "38": "LA",
  };

  const getZohoTaxesCache = async () => {
    if (!zohoTaxesCache) {
      zohoTaxesCache = await req.zoho.get("/settings/taxes", { page: 1, per_page: 200 });
    }
    return zohoTaxesCache;
  };

  const normalize = (value = "") =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isInterstateTaxObject = (obj = {}) => {
    const hay = normalize(
      [
        obj?.tax_name,
        obj?.tax_group_name,
        obj?.tax_type,
        obj?.tax_type_name,
        obj?.tax_specific_type,
      ]
        .filter(Boolean)
        .join(" ")
    );
    return hay.includes("igst") || hay.includes("interstate") || hay.includes("inter state");
  };

  const getTaxCatalog = async () => {
    await getZohoTaxesCache();
    const groups = (zohoTaxesCache?.tax_groups || []).map((g) => ({
      id: String(g.tax_group_id),
      rate: Number(g.tax_group_percentage || 0),
      name: g.tax_group_name || "",
      raw: g,
    }));
    const taxes = (zohoTaxesCache?.taxes || []).map((t) => ({
      id: String(t.tax_id),
      rate: Number(t.tax_percentage || 0),
      name: t.tax_name || "",
      raw: t,
    }));
    return [...groups, ...taxes];
  };

  const resolveOrganizationStateAlpha = async () => {
    try {
      const data = await req.zoho.get("/organizations", { page: 1, per_page: 200 });
      const organizations = data?.organizations || [];
      const currentOrgId = String(req.zoho?.organizationId || "");
      const org =
        organizations.find((o) => String(o?.organization_id || "") === currentOrgId) ||
        organizations.find((o) => o?.is_default_org) ||
        organizations[0];

      const gstState = extractGstStateCode(org?.gst_no || org?.gstin || "");
      return gstState ? GST_STATE_CODE_TO_POS[gstState] : undefined;
    } catch {
      return undefined;
    }
  };

  const resolveTaxIdByMode = async (incomingTaxId, mode, fallbackRate = 0) => {
    const id = String(incomingTaxId || "").trim();
    if (!id || mode === "auto") return id;

    const catalog = await getTaxCatalog();

    const selected = catalog.find((x) => x.id === id);
    if (selected) {
      const selectedIsInterstate = isInterstateTaxObject(selected.raw);
      if ((mode === "interstate" && selectedIsInterstate) || (mode === "intrastate" && !selectedIsInterstate)) {
        return id;
      }

      const target = catalog
        .filter((x) => Math.abs(Number(x.rate || 0) - Number(selected.rate || 0)) <= 0.05)
        .find((x) => (mode === "interstate" ? isInterstateTaxObject(x.raw) : !isInterstateTaxObject(x.raw)));

      if (target?.id) return target.id;
      return id;
    }

    // For preset tokens or name-like values, resolve by rate+mode.
    const desiredRate = Number(fallbackRate || 0);
    if (!(desiredRate >= 0)) return id;

    const candidates = catalog.filter((x) => Math.abs(Number(x.rate || 0) - desiredRate) <= 0.05);
    const target = candidates.find((x) => (mode === "interstate" ? isInterstateTaxObject(x.raw) : !isInterstateTaxObject(x.raw)));
    return target?.id || id;
  };

  const resolvePresetTaxId = async (presetId) => {
    if (!presetTaxToName[presetId]) return presetId;

    await getZohoTaxesCache();

    const lookupName = String(presetTaxToName[presetId] || "").toLowerCase();
    const groups = zohoTaxesCache?.tax_groups || [];
    const taxes = zohoTaxesCache?.taxes || [];

    const groupMatch = groups.find((g) => String(g.tax_group_name || "").toLowerCase() === lookupName);
    if (groupMatch?.tax_group_id) return groupMatch.tax_group_id;

    const taxMatch = taxes.find((t) => String(t.tax_name || "").toLowerCase() === lookupName);
    if (taxMatch?.tax_id) return taxMatch.tax_id;

    throw new ApiError(400, `${presetTaxToName[presetId]} is not configured in Zoho taxes. Please create it in Zoho first.`);
  };

  const resolveSpecialTaxExemption = async (specialId) => {
    await getZohoTaxesCache();
    const exemptions = zohoTaxesCache?.tax_exemptions || [];
    const matchTokens = specialTaxMatchTokens[specialId] || [];

    const matched = exemptions.find((ex) => {
      const hay = normalize(
        [
          ex?.tax_exemption_name,
          ex?.tax_exemption_code,
          ex?.tax_treatment_code,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return matchTokens.every((token) => hay.includes(token));
    });

    if (matched?.tax_exemption_id || matched?.tax_exemption_code) {
      return {
        ...(matched?.tax_exemption_id ? { tax_exemption_id: matched.tax_exemption_id } : {}),
        ...(matched?.tax_exemption_code ? { tax_exemption_code: matched.tax_exemption_code } : {}),
      };
    }

    // Fallbacks when Zoho doesn't return tax_exemptions in this org response shape.
    if (specialId === "special:out-of-scope") return { tax_exemption_code: "out_of_scope" };
    if (specialId === "special:non-gst-supply") return { tax_exemption_code: "non_gst_supply" };
    if (specialId === "special:non-taxable") return { tax_exemption_code: "non_taxable" };

    throw new ApiError(400, `Unable to resolve tax exemption for ${specialTaxLabels[specialId] || specialId}. Configure tax exemptions in Zoho and retry.`);
  };

  const orgStateAlpha = await resolveOrganizationStateAlpha();
  const destinationStateAlpha = isGstInvoice ? String(placeOfSupply || "").trim().toUpperCase() : "";
  const transactionMode =
    orgStateAlpha && destinationStateAlpha
      ? (orgStateAlpha === destinationStateAlpha ? "intrastate" : "interstate")
      : "auto";

  const items = [];
  for (const row of lineItems) {
    const description = String(row?.description || "").trim();
    const quantity = Number(row?.quantity || 0);
    const rate = Number(row?.rate || 0);
    const taxId = String(row?.taxId || "").trim();
    const discount = row?.discount === "" || row?.discount == null ? null : Number(row.discount);

    if (!description) throw new ApiError(400, "Each line item requires description");
    if (!(quantity > 0)) throw new ApiError(400, "Each line item requires quantity > 0");
    if (!(rate >= 0)) throw new ApiError(400, "Each line item requires valid rate");

    let lineItemTaxPayload = {};
    if (isGstInvoice) {
      if (!taxId) throw new ApiError(400, "Each line item requires tax selection for GST invoice");

      const isSpecialTax = Object.prototype.hasOwnProperty.call(specialTaxLabels, taxId);
      const resolvedTaxId = isSpecialTax ? taxId : await resolvePresetTaxId(taxId);
      const modeAdjustedTaxId = isSpecialTax
        ? null
        : await resolveTaxIdByMode(resolvedTaxId, transactionMode, Number(row?.taxPercentage || 0));
      const specialTaxExemption = isSpecialTax ? await resolveSpecialTaxExemption(taxId) : null;

      lineItemTaxPayload = isSpecialTax
        ? specialTaxExemption
        : { tax_id: modeAdjustedTaxId || resolvedTaxId };
    } else {
      // For non-GST invoices in Zoho, do not send tax_exemption fields.
      // Sending tax_exemption_code here causes Zoho to reject payload with
      // "Invalid Element tax_exemption_code" for /invoices.
      lineItemTaxPayload = {};
    }

    const itemId = await getOrCreateZohoItem(req.zoho, {
      name: description,
      price: rate,
      gst: Number(row?.taxPercentage || 0),
    });

    items.push({
      item_id: itemId,
      description,
      quantity,
      rate,
      ...lineItemTaxPayload,
      ...(discount != null && !Number.isNaN(discount) ? { discount } : {}),
    });
  }

  const payload = {
    customer_id: customerId,
    date: invoiceDate,
    ...(isGstInvoice && placeOfSupply ? { place_of_supply: placeOfSupply } : {}),
    line_items: items,
    ...(subject ? { subject: String(subject).trim() } : {}),
  };

  const idempotencyKey = `manual-sales-invoice-${customerId}-${Date.now()}`;
  let result;

  try {
    result = await req.zoho.post("/invoices", payload, idempotencyKey);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const interstateTaxError =
      message.includes("igst has to be applied") ||
      message.includes("interstate transaction");

    if (!interstateTaxError) throw error;

    // Retry once by force-mapping all taxable line items to interstate variants.
    const retryItems = await Promise.all(
      items.map(async (item) => {
        if (!item?.tax_id) return item;
        const forceInterstateTaxId = await resolveTaxIdByMode(item.tax_id, "interstate", 0);
        return { ...item, tax_id: forceInterstateTaxId || item.tax_id };
      })
    );

    result = await req.zoho.post(
      "/invoices",
      {
        ...payload,
        line_items: retryItems,
      },
      idempotencyKey
    );
  }

  res.status(201).json({ success: true, invoice: result?.invoice || result });
});

const deleteR2FileIfPresent = async (fileUrl) => {
  if (!fileUrl) return false;

  try {
    const r2PublicRaw = String(process.env.R2_PUBLIC_URL || "").trim();
    if (!r2PublicRaw) return false;
    const r2Public = /^https?:\/\//i.test(r2PublicRaw) ? r2PublicRaw : `https://${r2PublicRaw}`;

    if (!String(fileUrl).startsWith(r2Public)) {
      return false;
    }

    const parsedUrl = new URL(fileUrl);
    const key = parsedUrl.pathname.replace(/^\/+/, "");
    if (!key) return false;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: String(process.env.R2_BUCKET || "fimansy-documents").trim(),
        Key: decodeURIComponent(key),
      })
    );

    return true;
  } catch (error) {
    console.warn("Failed to delete source file from R2:", error?.message || error);
    return false;
  }
};












/*

{
  "customer_id": "9823749234",
  "date": "2025-11-26",
  "invoice_number": "7EB040A0-0013",
  "place_of_supply": "KA",
  "gst_treatment": "business_gst",
  "line_items": [
    {
      "name": "Software Subscription",
      "rate": 25.05,
      "quantity": 1,
      "tax_id": "igstrcm_18"
    }
  ]
}

*/
