import { pushInvoiceToZoho } from "../services/zohoInvoiceService.js";
import { asynchandler } from "../utils/asynchandler.js";
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

  const result = await pushInvoiceToZoho(req.zoho, invoice);

  res.json({
    success: true,
    zohoInvoiceId: result.invoice_id,
  });
});












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
