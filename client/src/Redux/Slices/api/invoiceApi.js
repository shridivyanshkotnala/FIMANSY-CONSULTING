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

  }),
});

export const { useSyncInvoiceMutation } = invoiceApi;
