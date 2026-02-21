export const getOrCreateZohoItem = async (zohoClient, item) => {

  const search = await zohoClient.get("/items", {
    name: item.name,
  });

  if (search.items?.length) {
    return search.items[0].item_id;
  }

  const created = await zohoClient.post("/items", {
    name: item.name,
    rate: item.price,
    unit: "pcs",
    tax_percentage: item.gst || 0,
  });

  return created.item.item_id;
};
