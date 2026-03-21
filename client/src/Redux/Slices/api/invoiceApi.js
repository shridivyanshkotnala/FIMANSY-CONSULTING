import { baseApi } from "./baseApi";

export const invoiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    syncInvoice: builder.mutation({
      query: (invoice) => ({
        url: "/invoice/sync",
        method: "POST",
        body: { invoice },
      }),
    }),

    getZohoCustomers: builder.query({
      query: (search = "") => ({
        url: "/invoice/customers",
        params: search ? { search } : undefined,
      }),
      transformResponse: (res) => res?.customers || [],
    }),

    createZohoCustomer: builder.mutation({
      query: (payload) => ({
        url: "/invoice/customers",
        method: "POST",
        body: payload,
      }),
    }),

    getZohoTaxes: builder.query({
      query: () => "/invoice/taxes",
      transformResponse: (res) => res?.taxes || [],
    }),

    createSalesInvoiceInZoho: builder.mutation({
      query: (payload) => ({
        url: "/invoice/sales/create",
        method: "POST",
        body: payload,
      }),
    }),

  }),
});

export const {
  useSyncInvoiceMutation,
  useGetZohoCustomersQuery,
  useCreateZohoCustomerMutation,
  useGetZohoTaxesQuery,
  useCreateSalesInvoiceInZohoMutation,
} = invoiceApi;
