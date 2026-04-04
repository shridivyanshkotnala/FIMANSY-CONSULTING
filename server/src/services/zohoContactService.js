import { normalizeIndianGstin, resolveVendorTaxProfile } from "../utils/zohoGstState.js";

export const getOrCreateZohoCustomer = async (zohoClient, customer) => {
  const search = await zohoClient.get("/contacts", {
    contact_name: customer.name,
  });

  if (search.contacts?.length) {
    return search.contacts[0].contact_id;
  }

  const gstNo = normalizeIndianGstin(customer.gstin);

  const created = await zohoClient.post("/contacts", {
    contact_name: customer.name,
    company_name: customer.name,
    contact_type: "customer",
    ...(gstNo ? { gst_no: gstNo, gst_treatment: "business_gst" } : {}),
    billing_address: {
      state_code: customer.state_code || "DL",
      country: "India",
    },
  });

  return created.contact.contact_id;
};

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

export const getOrCreateZohoVendor = async (zohoClient, vendorInput) => {
  const vendor =
    typeof vendorInput === "string"
      ? { name: vendorInput }
      : (vendorInput || {});

  const vendorName = String(vendor.name || vendor.vendor_name || "").trim();
  if (!vendorName) {
    throw new Error("vendor name is required");
  }

  const search = await zohoClient.get("/contacts", {
    contact_name: vendorName,
    contact_type: "vendor",
    page: 1,
    per_page: 200,
  });

  const contacts = search?.contacts || [];
  const exact = contacts.find((contact) => normalize(contact?.contact_name) === normalize(vendorName));
  if (exact?.contact_id) {
    return exact.contact_id;
  }

  if (contacts[0]?.contact_id) {
    return contacts[0].contact_id;
  }

  const city = String(vendor.city || vendor.vendor_city || "").trim() || undefined;
  const taxProfile = resolveVendorTaxProfile({
    gstin: vendor.gstin || vendor.vendor_gstin,
    gstTreatment: vendor.gst_treatment,
    city,
    country: vendor.country || vendor.vendor_country,
    vendorName,
    gstReasoning: vendor.gst_reasoning || vendor.gstReasoning,
  });

  const billingAddress = {
    ...(city ? { city } : {}),
    ...(taxProfile.gstStateCode ? { state_code: taxProfile.gstStateCode } : {}),
    ...(taxProfile.country ? { country: taxProfile.country } : {}),
  };

  const payload = {
    contact_name: vendorName,
    company_name: vendorName,
    contact_type: "vendor",
    gst_treatment: taxProfile.gstTreatment,
    ...(taxProfile.gstNo ? { gst_no: taxProfile.gstNo } : {}),
    ...(Object.keys(billingAddress).length ? { billing_address: billingAddress } : {}),
  };

  const created = await zohoClient.post("/contacts", payload, `vendor-${vendorName.toLowerCase()}`);
  return created?.contact?.contact_id;
};
