import { baseApi } from "./baseApi";

export const cashIntelligenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getDSO: builder.query({
      query: () => ({
        url: "/cash-intelligence/dso",
        method: "GET",
      }),
      providesTags: ["CashIntelligence"],
    }),

    getAgingBuckets: builder.query({
      query: () => ({
        url: "/cash-intelligence/aging-buckets",
        method: "GET",
      }),
      providesTags: ["CashIntelligence"],
    }),

  }),
});

export const { useGetDSOQuery, useGetAgingBucketsQuery } = cashIntelligenceApi;