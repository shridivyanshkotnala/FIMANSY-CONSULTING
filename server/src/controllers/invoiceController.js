import { pushInvoiceToZoho } from "../services/zohoInvoiceService.js";
import { pushExpenseToZoho } from "../services/zohoExpenseService.js";
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

  let result;
  if ((invoice.document_category || "").toLowerCase() === "expense") {
    result = await pushExpenseToZoho(req.zoho, invoice);
  } else {
    result = await pushInvoiceToZoho(req.zoho, invoice);
  }

  const sourceFileUrl = invoice.source_file || invoice.pdf_url || null;
  const deletedSourceFile = await deleteR2FileIfPresent(sourceFileUrl);

  res.json({
    success: true,
    zohoInvoiceId: result.invoice_id || result.expense?.expense_id || result.expense_id,
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
    invoiceDate,
    subject,
    lineItems,
  } = req.body || {};

  if (!customerId) throw new ApiError(400, "customerId is required");
  if (!placeOfSupply) throw new ApiError(400, "placeOfSupply is required");
  if (!invoiceDate) throw new ApiError(400, "invoiceDate is required");
  if (!Array.isArray(lineItems) || !lineItems.length) {
    throw new ApiError(400, "At least one line item is required");
  }

  const specialTaxLabels = {
    "special:non-taxable": "Non-Taxable",
    "special:out-of-scope": "Out of Scope",
    "special:non-gst-supply": "Non-GST Supply",
  };

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
    if (!taxId) throw new ApiError(400, "Each line item requires tax selection");

    const isSpecialTax = Object.prototype.hasOwnProperty.call(specialTaxLabels, taxId);

    const itemId = await getOrCreateZohoItem(req.zoho, {
      name: description,
      price: rate,
      gst: Number(row?.taxPercentage || 0),
    });

    items.push({
      item_id: itemId,
      description: isSpecialTax ? `${description} (${specialTaxLabels[taxId]})` : description,
      quantity,
      rate,
      ...(isSpecialTax ? {} : { tax_id: taxId }),
      ...(discount != null && !Number.isNaN(discount) ? { discount } : {}),
    });
  }

  const payload = {
    customer_id: customerId,
    date: invoiceDate,
    place_of_supply: placeOfSupply,
    line_items: items,
    ...(subject ? { subject: String(subject).trim() } : {}),
  };

  const result = await req.zoho.post(
    "/invoices",
    payload,
    `manual-sales-invoice-${customerId}-${Date.now()}`
  );

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
