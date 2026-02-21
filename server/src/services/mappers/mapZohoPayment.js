export const mapZohoPayment = (p) => ({
  paymentId: p.payment_id,
  customerId: p.customer_id,
  amount: p.amount,
  paymentDate: p.date ? new Date(p.date) : null,

  invoices: (p.invoices || []).map(i => ({
    invoiceId: i.invoice_id,
    amountApplied: i.amount_applied
  })),

  lastModifiedTime: p.last_modified_time
});