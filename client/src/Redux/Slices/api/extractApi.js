import { baseApi } from "./baseApi";

export const extractApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // ===============================
    // INVOICE AI EXTRACTION
    // ===============================
    extractInvoice: builder.mutation({

      query: ({ fileUrl, fileName }) => ({
        url: "/extract/extract-invoice",
        method: "POST",
        body: { fileUrl, fileName },
      }),

      transformResponse: (response) => {
        console.log('🔧 API Response:', response);
        
        if (!response.success) {
          throw new Error(response.error || "Extraction failed");
        }

        // Server returns { success: true, extractedData: {...} }
        const data = response.extractedData || response.invoice || response;
        console.log('🔧 Transformed Data:', data);
        return data;
      },

    }),
  }),
});

export const {
  useExtractInvoiceMutation,
} = extractApi;
