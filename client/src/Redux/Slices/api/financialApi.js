import { baseApi } from "./baseApi";

const financialReportListTag = (scope) => ({ type: "FinancialReport", id: `LIST-${scope}` });

export const financialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCashIntelligence: builder.query({
      query: () => "/cash/aging",
      providesTags: ["Aging"],
      transformResponse: (response) => response,
    }),

    getFinancialReports: builder.query({
      query: ({ reportType, customTag, search, periodStart, periodEnd, uploadedStart, uploadedEnd, page = 1, limit = 20 } = {}) => ({
        url: "/upload/financial-reports",
        method: "GET",
        params: {
          ...(reportType ? { type: reportType } : {}),
          ...(customTag ? { tag: customTag } : {}),
          ...(search ? { search } : {}),
          ...(periodStart ? { period_start: periodStart } : {}),
          ...(periodEnd ? { period_end: periodEnd } : {}),
          ...(uploadedStart ? { uploaded_start: uploadedStart } : {}),
          ...(uploadedEnd ? { uploaded_end: uploadedEnd } : {}),
          page,
          limit,
        },
      }),
      providesTags: (result, error, args) => [
        financialReportListTag(`CLIENT-${JSON.stringify(args || {})}`),
        financialReportListTag("CLIENT"),
      ],
    }),

    getFinancialReportViewUrl: builder.query({
      query: (reportId) => ({
        url: `/upload/financial-reports/${reportId}/view-url`,
        method: "GET",
      }),
      transformResponse: (response) => response?.data || response,
    }),

    getAccountantFinancialReports: builder.query({
      query: ({ orgId, reportType, customTag, search, periodStart, periodEnd, uploadedStart, uploadedEnd, page = 1, limit = 20 } = {}) => ({
        url: `/accountant/organizations/${orgId}/financial-reports`,
        method: "GET",
        params: {
          ...(reportType ? { type: reportType } : {}),
          ...(customTag ? { tag: customTag } : {}),
          ...(search ? { search } : {}),
          ...(periodStart ? { period_start: periodStart } : {}),
          ...(periodEnd ? { period_end: periodEnd } : {}),
          ...(uploadedStart ? { uploaded_start: uploadedStart } : {}),
          ...(uploadedEnd ? { uploaded_end: uploadedEnd } : {}),
          page,
          limit,
        },
      }),
      providesTags: (result, error, args) => [
        financialReportListTag(`ACCOUNTANT-${args?.orgId}-${JSON.stringify(args || {})}`),
        financialReportListTag(`ACCOUNTANT-${args?.orgId}-ALL`),
      ],
    }),

    getAccountantFinancialReportViewUrl: builder.query({
      query: ({ orgId, reportId }) => ({
        url: `/accountant/organizations/${orgId}/financial-reports/${reportId}/view-url`,
        method: "GET",
      }),
      transformResponse: (response) => response?.data || response,
    }),

    initAccountantFinancialReportUpload: builder.mutation({
      query: ({ orgId, body }) => ({
        url: `/accountant/organizations/${orgId}/financial-reports/init-upload`,
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.data || response,
    }),

    completeAccountantFinancialReportUpload: builder.mutation({
      query: ({ orgId, body }) => ({
        url: `/accountant/organizations/${orgId}/financial-reports/complete-upload`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { orgId }) => [
        financialReportListTag(`ACCOUNTANT-${orgId}-ALL`),
        financialReportListTag("CLIENT"),
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCashIntelligenceQuery,
  useGetFinancialReportsQuery,
  useLazyGetFinancialReportViewUrlQuery,
  useGetAccountantFinancialReportsQuery,
  useLazyGetAccountantFinancialReportViewUrlQuery,
  useInitAccountantFinancialReportUploadMutation,
  useCompleteAccountantFinancialReportUploadMutation,
} = financialApi;
