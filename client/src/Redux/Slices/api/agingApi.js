import { baseApi } from "./baseApi";

export const agingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getAgingBuckets: builder.query({
      query: () => "/cash-intelligence/aging-buckets",
      providesTags: ["Aging"]
    }),

    getAgingAlerts: builder.query({
      // Request all invoice types so UI can display status (draft, paid, sent, etc.)
      query: () => "/cash-intelligence/aging-alerts?all=1",
      providesTags: ["Aging"]
    }),

  }),
});

export const {
  useGetAgingBucketsQuery,
  useGetAgingAlertsQuery,
} = agingApi;
