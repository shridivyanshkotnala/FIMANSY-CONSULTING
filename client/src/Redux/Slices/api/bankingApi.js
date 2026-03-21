import { baseApi } from "./baseApi";

export const bankingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // ----------------------------------------
    // GET DASHBOARD
    // ----------------------------------------
    getBankDashboard: builder.query({
      query: ({
        bankAccountId,
        startDate,
        endDate,
        status,
        transactionType,
        search,
        page = 1,
        limit = 20,
      }) => ({
        url: "/banking/dashboard",
        params: {
          bankAccountId,
          startDate,
          endDate,
          status,
          transactionType,
          search,
          page,
          limit,
        },
      }),
      providesTags: ["Banking"],
    }),

    // ----------------------------------------
    // UPDATE CATEGORY
    // ----------------------------------------
    updateTransactionCategory: builder.mutation({
      query: ({ id, category }) => ({
        url: `/banking/transaction/${id}/category`,
        method: "PATCH",
        body: { category },
      }),
      invalidatesTags: ["Banking"],
    }),

    // ----------------------------------------
    // ACCEPT TRANSACTION
    // ----------------------------------------
    acceptTransaction: builder.mutation({
      query: ({ id }) => ({
        url: `/banking/transaction/${id}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["Banking"],
    }),

    // ----------------------------------------
    // REPORT ISSUE (BANK RECON QUERY)
    // ----------------------------------------
    reportTransactionIssue: builder.mutation({
      query: ({ id, message }) => ({
        url: `/banking/transaction/${id}/report-issue`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: ["Banking"],
    }),

    // ------------------------------
    // PAYMENT HISTORY
    // ------------------------------
    getPaymentHistory: builder.query({
      query: ({
        status,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      }) => ({
        url: "/banking/payments",
        params: {
          status,
          search,
          startDate,
          endDate,
          page,
          limit,
        },
      }),
      providesTags: ["Payments"],
    }),

    // ------------------------------
    // OPTIONAL: FORCE REFETCH
    // ------------------------------
    refetchPaymentHistory: builder.mutation({
      query: () => ({
        url: "/banking/payments",
        method: "GET",
      }),
      invalidatesTags: ["Payments"],
    }),

    // ------------------------------
    // REBUILD VENDOR PAYMENT LEDGER
    // ------------------------------
    rebuildPaymentLedger: builder.mutation({
      query: () => ({
        url: "/banking/payments/force-sync",
        method: "POST",
      }),
      invalidatesTags: ["Payments"],
    }),


  }),
});

export const {
  useGetBankDashboardQuery,
  useUpdateTransactionCategoryMutation,
  useAcceptTransactionMutation,
  useReportTransactionIssueMutation,
  useGetPaymentHistoryQuery,
  useRefetchPaymentHistoryMutation,
  useRebuildPaymentLedgerMutation,
} = bankingApi;