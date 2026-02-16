import { baseApi } from "./baseApi";

export const zohoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getZohoStatus: builder.query({
      query: () => "/zoho/status",
      providesTags: ["Zoho"],
    }),

  }),
});

export const { useGetZohoStatusQuery } = zohoApi;