export const mapZohoInvoice = (z) => ({
  invoiceId: z.invoice_id,
  customerId: z.customer_id,
  customerName: z.customer_name || z.contact_name || (z.customer && (z.customer.name || z.customer.contact_name)) || null,
  invoiceNumber: z.invoice_number,
  status: z.status,

  invoiceDate: z.date ? new Date(z.date) : null,
  dueDate: z.due_date ? new Date(z.due_date) : null,

  total: z.total,
  balance: z.balance,

  lastModifiedTime: z.last_modified_time
});