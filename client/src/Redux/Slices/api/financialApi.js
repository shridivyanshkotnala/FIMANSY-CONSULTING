import { baseApi } from "./baseApi";

export const financialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getCashIntelligence: builder.query({
      query: () => "/cash/aging",

      providesTags: ["Aging"],

      transformResponse: (response) => {
        // backend returns full object already
        return response;
      },
    }),

  }),
});

export const {
  useGetCashIntelligenceQuery,
} = financialApi;
