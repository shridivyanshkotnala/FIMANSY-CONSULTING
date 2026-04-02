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
  const rawPos = String(aiInvoice.place_of_supply || "").trim();
  const normalizedState = normalizeState(rawPos);
  const codeMatch = rawPos.match(/^([A-Za-z]{2})$/);
  const gstCodeWithStateMatch = rawPos.match(/^\d{1,2}\s*[- ]\s*([A-Za-z]{2})$/);

  const placeOfSupplyCode =
    (codeMatch ? codeMatch[1].toUpperCase() : null) ||
    (gstCodeWithStateMatch ? gstCodeWithStateMatch[1].toUpperCase() : null) ||
    stateMap[normalizedState] ||
    rawPos ||
    undefined;

  return {
    document_category: category,
    invoice_number: aiInvoice.invoice_number,
    date_of_issue: aiInvoice.date_of_issue,
    due_date: aiInvoice.due_date,
    vendor_name: aiInvoice.vendor_name,
    vendor_gstin: aiInvoice.vendor_gstin,
    vendor_city: aiInvoice.vendor_city,
    vendor_country: aiInvoice.vendor_country,
    place_of_supply: placeOfSupplyCode,
    taxable_amount: Number(aiInvoice.taxable_amount) || 0,
    cgst: Number(aiInvoice.cgst) || 0,
    sgst: Number(aiInvoice.sgst) || 0,
    igst: Number(aiInvoice.igst) || 0,
    total_gst: Number(aiInvoice.total_gst) || 0,
    total_with_gst: Number(aiInvoice.total_with_gst) || 0,
    expense_account: aiInvoice.expense_account,
    expense_account_group: aiInvoice.expense_account_group,
    payment_mode: aiInvoice.payment_mode,
    is_tds_applicable: Boolean(aiInvoice.is_tds_applicable),
    tds_nature: aiInvoice.tds_nature,
    tds_section: aiInvoice.tds_section,
    tds_rate: aiInvoice.tds_rate == null ? null : Number(aiInvoice.tds_rate),
    tds_amount: aiInvoice.tds_amount || 0,
    tds_tax_name: aiInvoice.tds_tax_name,
    tds_tax_id: aiInvoice.tds_tax_id || null,
    tds_reasoning: aiInvoice.tds_reasoning,
    tds_manual_override: Boolean(aiInvoice.tds_manual_override),
    gst_reasoning: aiInvoice.gst_reasoning,
    confidence: aiInvoice.confidence,
    source_file: aiInvoice.source_file || aiInvoice.pdf_url || null,
    meta: {
      source: "ai_expense_import",
      extraction_model: "gemini-2.5-pro",
    },
  };
}
