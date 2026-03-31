export const getOrCreateZohoCustomer = async (zohoClient, customer) => {

  // search existing
  const search = await zohoClient.get("/contacts", {
    contact_name: customer.name,
  });

  if (search.contacts?.length) {
    return search.contacts[0].contact_id;
  }

  // create
  const created = await zohoClient.post("/contacts", {
    contact_name: customer.name,
    company_name: customer.name,
    contact_type: "customer",

    ...(customer.gstin && { gst_no: customer.gstin }),

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
  const exact = contacts.find((c) => normalize(c?.contact_name) === normalize(vendorName));
  if (exact?.contact_id) {
    return exact.contact_id;
  }

  if (contacts[0]?.contact_id) {
    return contacts[0].contact_id;
  }

  const gstNo = String(vendor.gstin || vendor.vendor_gstin || "")
    .replace(/\s+/g, "")
    .toUpperCase();

  const payload = {
    contact_name: vendorName,
    company_name: vendorName,
    contact_type: "vendor",
    ...(gstNo
      ? {
          gst_treatment: "business_gst",
          gst_no: gstNo,
        }
      : {}),
    billing_address: {
      city: String(vendor.city || vendor.vendor_city || "").trim() || undefined,
      country: "India",
    },
  };

  const created = await zohoClient.post("/contacts", payload, `vendor-${vendorName.toLowerCase()}`);
  return created?.contact?.contact_id;
};
