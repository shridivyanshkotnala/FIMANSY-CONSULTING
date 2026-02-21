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
