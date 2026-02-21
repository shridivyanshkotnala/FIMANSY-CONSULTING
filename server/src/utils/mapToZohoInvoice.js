const INDIA_STATE_CODES = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  "Punjab": "03",
  "Chandigarh": "04",
  "Uttarakhand": "05",
  "Haryana": "06",
  "Delhi": "07",
  "Rajasthan": "08",
  "Uttar Pradesh": "09",
  "Bihar": "10",
  "Sikkim": "11",
  "Arunachal Pradesh": "12",
  "Nagaland": "13",
  "Manipur": "14",
  "Mizoram": "15",
  "Tripura": "16",
  "Meghalaya": "17",
  "Assam": "18",
  "West Bengal": "19",
  "Jharkhand": "20",
  "Odisha": "21",
  "Chhattisgarh": "22",
  "Madhya Pradesh": "23",
  "Gujarat": "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Maharashtra": "27",
  "Karnataka": "29",
  "Goa": "30",
  "Lakshadweep": "31",
  "Kerala": "32",
  "Tamil Nadu": "33",
  "Puducherry": "34",
  "Andaman and Nicobar Islands": "35",
  "Telangana": "36",
  "Andhra Pradesh": "37",
  "Ladakh": "38"
};

function normalizeState(input) {
  if (!input) return null;

  const cleaned = input.toLowerCase().replace(/[^a-z ]/g, "").trim();

  for (const state in INDIA_STATE_CODES) {
    if (cleaned.includes(state.toLowerCase())) {
      return INDIA_STATE_CODES[state];
    }
  }

  return null;
}

function determineGstTreatment(invoice) {
//   if (invoice.vendor_gstin && invoice.customer_name)
//     return "business_gst";

//   if (!invoice.vendor_gstin && invoice.place_of_supply)
//     return "overseas"; // RCM import

//   return "business_none";
if (invoice.customer_gstin) return "business_gst";
return "consumer";

}

function buildLineItems(invoice) {

  // const taxType =
  //   invoice.igst > 0 ? "igst" :
  //   invoice.cgst > 0 ? "gst" :
  //   "none";
  const taxType =
  (invoice.igst > 0 || invoice.cgst > 0 || invoice.sgst > 0)
    ? "taxable"
    : "non_taxable";


  return [
    {
      name: invoice.expense_account || "Imported Item",
      rate: Number(invoice.taxable_amount) || 0,
      quantity: 1,
      tax_preference: taxType,
    }
  ];
}

export function mapToZohoInvoice(aiInvoice) {

  const placeOfSupplyCode = normalizeState(aiInvoice.place_of_supply);

  return {
    invoice_number: aiInvoice.invoice_number || `AI-${Date.now()}`,
    date: aiInvoice.date_of_issue,
    due_date: aiInvoice.due_date || aiInvoice.date_of_issue,

    customer: {
      name: aiInvoice.customer_name || "Unknown Customer",
      gst_treatment: determineGstTreatment(aiInvoice),
      state_code: placeOfSupplyCode,
    },

    line_items: buildLineItems(aiInvoice),

    gst_summary: {
      cgst: Number(aiInvoice.cgst) || 0,
      sgst: Number(aiInvoice.sgst) || 0,
      igst: Number(aiInvoice.igst) || 0,
      total: Number(aiInvoice.total_gst) || 0
    },

    totals: {
      subtotal: Number(aiInvoice.taxable_amount) || 0,
      grand_total: Number(aiInvoice.total_with_gst) || 0
    },

    meta: {
      extracted_vendor: aiInvoice.vendor_name,
      confidence: aiInvoice.confidence,
      source_pdf: aiInvoice.source_file,
      extraction_model: "gemini"
    }
  };
}
