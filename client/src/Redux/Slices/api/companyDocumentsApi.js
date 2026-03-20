import { baseApi } from "./baseApi";

export const companyDocumentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyDocuments: builder.query({
      query: ({ documentType } = {}) => ({
        url: "/upload/company-documents",
        method: "GET",
        params: documentType ? { type: documentType } : undefined,
      }),
      transformResponse: (response) => response?.data || [],
      providesTags: (result, error, args) => [
        { type: "CompanyDocument", id: `CLIENT-${args?.documentType || "all"}` },
      ],
    }),

    initCompanyDocumentUpload: builder.mutation({
      query: (body) => ({
        url: "/upload/company-documents/init-upload",
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.data || response,
    }),

    completeCompanyDocumentUpload: builder.mutation({
      query: (body) => ({
        url: "/upload/company-documents/complete-upload",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "CompanyDocument", id: "CLIENT-all" },
        { type: "CompanyDocument", id: "CLIENT-loan" },
        { type: "CompanyDocument", id: "CLIENT-equity" },
        { type: "CompanyDocument", id: "CLIENT-other" },
      ],
    }),

    getAccountantCompanyDocuments: builder.query({
      query: ({ orgId, documentType } = {}) => ({
        url: `/accountant/organizations/${orgId}/company-documents`,
        method: "GET",
        params: documentType ? { type: documentType } : undefined,
      }),
      transformResponse: (response) => response?.data || [],
      providesTags: (result, error, args) => [
        { type: "CompanyDocument", id: `ACCOUNTANT-${args?.orgId}-${args?.documentType || "all"}` },
      ],
    }),

    initAccountantCompanyDocumentUpload: builder.mutation({
      query: ({ orgId, body }) => ({
        url: `/accountant/organizations/${orgId}/company-documents/init-upload`,
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.data || response,
    }),

    completeAccountantCompanyDocumentUpload: builder.mutation({
      query: ({ orgId, body }) => ({
        url: `/accountant/organizations/${orgId}/company-documents/complete-upload`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { orgId }) => [
        { type: "CompanyDocument", id: `ACCOUNTANT-${orgId}-all` },
        { type: "CompanyDocument", id: `ACCOUNTANT-${orgId}-loan` },
        { type: "CompanyDocument", id: `ACCOUNTANT-${orgId}-equity` },
        { type: "CompanyDocument", id: `ACCOUNTANT-${orgId}-other` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCompanyDocumentsQuery,
  useInitCompanyDocumentUploadMutation,
  useCompleteCompanyDocumentUploadMutation,
  useGetAccountantCompanyDocumentsQuery,
  useInitAccountantCompanyDocumentUploadMutation,
  useCompleteAccountantCompanyDocumentUploadMutation,
} = companyDocumentsApi;
