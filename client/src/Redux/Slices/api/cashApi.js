import { baseApi } from "./baseApi";

export const cashApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // Aging Intelligence (MAIN DATA SOURCE)
    getAging: builder.query({
      query: () => ({
        url: "/cash/aging",
        method: "GET",
      }),

      providesTags: ["Aging"],

      /*
        This data is expensive to compute.
        Keep in cache for 5 minutes.
      */
      keepUnusedDataFor: 300,

      /*
        Auto refresh every 2 minutes ONLY
        while user is on dashboard
      */
      pollingInterval: 120000,
    }),

  }),
});

export const { useGetAgingQuery } = cashApi;
