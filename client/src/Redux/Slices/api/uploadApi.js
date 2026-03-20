// export const uploadApi = baseApi.injectEndpoints({
//   endpoints: (builder) => ({
//     getUploadUrl: builder.mutation({
//       query: ({ fileName, contentType }) => ({
//         url: "/upload/signed-url",
//         method: "POST",
//         body: { fileName, contentType },
//       }),
//     }),
//   }),
// });

// export const { useGetUploadUrlMutation } = uploadApi;


import { baseApi } from "./baseApi";

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    initInvoiceUpload: builder.mutation({
      query: ({ fileName, contentType, fileSize }) => ({
        url: "/upload/invoice/init-upload",
        method: "POST",
        body: { fileName, contentType, fileSize },
      }),
      transformResponse: (response) => response?.data || response,
    }),

    processInvoice: builder.mutation({
      query: ({ fileUrl, documentType }) => ({
        url: "/upload/ingest",
        method: "POST",
        body: { fileUrl, documentType },
      }),

      transformResponse: (response) => {
        console.log('🔧 processInvoice API Response:', response);
        
        if (!response.success)
          throw new Error(response.message || "Invoice processing failed");

        // Server returns { success: true, extractedData: {...} }
        const data = response.extractedData || response.data || response;
        console.log('🔧 processInvoice Transformed Data:', data);
        return data;
      },
    }),

  }),
});

export const {
  useInitInvoiceUploadMutation,
  useProcessInvoiceMutation,
} = uploadApi;
