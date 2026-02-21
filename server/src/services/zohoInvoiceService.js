import { getOrCreateZohoCustomer } from "./zohoContactService.js";
import { getOrCreateZohoItem } from "./zohoItemService.js";
export const pushInvoiceToZoho = async (zohoClient, invoice) => {

  // 1️⃣ ensure customer
  const contactId = await getOrCreateZohoCustomer(zohoClient, invoice.customer);

  // 2️⃣ ensure items
  const line_items = [];

  for (const item of invoice.line_items) {
    const itemId = await getOrCreateZohoItem(zohoClient, item);

    line_items.push({
      item_id: itemId,
      rate: item.rate,
      quantity: item.quantity,
    });
  }

  // 3️⃣ create invoice
  const zohoInvoice = await zohoClient.post(
    "/invoices",
    {
      customer_id: contactId,
      date: invoice.date,
      reference_number: invoice.invoice_number,
      // place_of_supply: invoice.place_of_supply || "07",
      line_items,
    },
    `invoice-${invoice._id}` // idempotency key
  );

  return zohoInvoice;
};


/* 

const zohoInvoice = await zohoClient.post(
    "/invoices",
    {
      customer_id: contactId,
      date: invoice.date,
      due_date: invoice.due_date,
      invoice_number: invoice.invoice_number,
      place_of_supply: invoice.customer.place_of_supply,
      line_items,
    },
    `invoice-${invoice.invoice_number}` // idempotency key
  );

  return zohoInvoice.invoice;
};

*/
