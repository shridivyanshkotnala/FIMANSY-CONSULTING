// Redux/Slices/api/orgApi.js
import { baseApi } from "./baseApi";

export const orgApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getMyOrganizations: builder.query({
      query: () => "/org/myorg",
      providesTags: ["Org"],
      transformResponse: (res) => res,
    }),

  }),
});

export const { useGetMyOrganizationsQuery } = orgApi;
