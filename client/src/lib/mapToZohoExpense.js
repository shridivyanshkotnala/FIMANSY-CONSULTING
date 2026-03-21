export function mapToZohoExpense(aiInvoice) {
  const category = String(aiInvoice.document_category || "expense").toLowerCase();

  const stateMap = {
    andamanandnicobarislands: "AN",
    andhrapradesh: "AP",
    arunachalpradesh: "AR",
    assam: "AS",
    bihar: "BR",
    chandigarh: "CH",
    chhattisgarh: "CG",
    delhi: "DL",
    goa: "GA",
    gujarat: "GJ",
    haryana: "HR",
    himachalpradesh: "HP",
    jammuandkashmir: "JK",
    jharkhand: "JH",
    karnataka: "KA",
    kerala: "KL",
    ladakh: "LA",
    lakshadweep: "LD",
    madhyapradesh: "MP",
    maharashtra: "MH",
    manipur: "MN",
    meghalaya: "ML",
    mizoram: "MZ",
    nagaland: "NL",
    odisha: "OD",
    puducherry: "PY",
    punjab: "PB",
    rajasthan: "RJ",
    sikkim: "SK",
    tamilnadu: "TN",
    telangana: "TS",
    tripura: "TR",
    uttarpradesh: "UP",
    uttarakhand: "UK",
    westbengal: "WB",
    dadraandnagarhavelianddamananddiu: "DN",
  };

  const normalizeState = (value = "") => String(value).toLowerCase().replace(/[^a-z]/g, "");
  const normalizedState = normalizeState(aiInvoice.place_of_supply);
  const placeOfSupplyCode = stateMap[normalizedState] || aiInvoice.place_of_supply || undefined;

  return {
    document_category: category,
    invoice_number: aiInvoice.invoice_number,
    date_of_issue: aiInvoice.date_of_issue,
    due_date: aiInvoice.due_date,
    vendor_name: aiInvoice.vendor_name,
    vendor_gstin: aiInvoice.vendor_gstin,
    place_of_supply: placeOfSupplyCode,
    taxable_amount: Number(aiInvoice.taxable_amount) || 0,
    cgst: Number(aiInvoice.cgst) || 0,
    sgst: Number(aiInvoice.sgst) || 0,
    igst: Number(aiInvoice.igst) || 0,
    total_gst: Number(aiInvoice.total_gst) || 0,
    total_with_gst: Number(aiInvoice.total_with_gst) || 0,
    expense_account: aiInvoice.expense_account,
    payment_mode: aiInvoice.payment_mode,
    gst_reasoning: aiInvoice.gst_reasoning,
    confidence: aiInvoice.confidence,
    source_file: aiInvoice.source_file || aiInvoice.pdf_url || null,
    meta: {
      source: "ai_expense_import",
      extraction_model: "gemini-2.5-pro",
    },
  };
}
