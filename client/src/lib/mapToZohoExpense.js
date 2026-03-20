export function mapToZohoExpense(aiInvoice) {
  return {
    document_category: "expense",
    invoice_number: aiInvoice.invoice_number,
    date_of_issue: aiInvoice.date_of_issue,
    due_date: aiInvoice.due_date,
    vendor_name: aiInvoice.vendor_name,
    vendor_gstin: aiInvoice.vendor_gstin,
    place_of_supply: aiInvoice.place_of_supply,
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
