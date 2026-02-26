export const pushBillToZoho = async (zohoClient, bill) => {

  const vendorId = await getOrCreateZohoVendor(
    zohoClient,
    bill.vendor
  );

  const line_items = bill.line_items.map(item => ({
    name: item.name,
    rate: item.rate,
    quantity: item.quantity,
  }));

  const result = await zohoClient.post(
    "/bills",
    {
      vendor_id: vendorId,
      date: bill.date,
      reference_number: bill.bill_number,
      line_items,
    },
    `bill-${bill._id}`
  );

  return result;
};