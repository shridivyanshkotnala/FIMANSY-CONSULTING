
export function mapToZohoInvoice(aiInvoice) {

  // GST treatment logic
  let gstTreatment = "business_none";
  if (aiInvoice.vendor_gstin) gstTreatment = "business_gst";
  else gstTreatment = "overseas"; // reverse charge scenario

  // State code extraction (Zoho expects code, not name)
  const stateMap = {
    Karnataka: "KA",
    Maharashtra: "MH",
    Delhi: "DL",
    Gujarat: "GJ",
    TamilNadu: "TN"
  };

  const placeOfSupply = stateMap[aiInvoice.place_of_supply] || null;

  return {
    invoice_number: aiInvoice.invoice_number,
    date: aiInvoice.date_of_issue,
    due_date: aiInvoice.due_date,

    customer: {
      name: aiInvoice.customer_name,
      place_of_supply: placeOfSupply,
      gst_treatment: gstTreatment,
    },

    line_items: [
      {
        name: aiInvoice.expense_account || "Item",
        rate: aiInvoice.taxable_amount,
        quantity: 1,
        tax: {
          cgst: aiInvoice.cgst,
          sgst: aiInvoice.sgst,
          igst: aiInvoice.igst
        }
      }
    ],

    meta: {
      source: "ai_import",
      confidence: aiInvoice.confidence,
      pdf_url: aiInvoice.source_file
    }
  };
}
