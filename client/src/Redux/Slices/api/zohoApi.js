import { baseApi } from "./baseApi";

export const zohoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getZohoStatus: builder.query({
      query: () => "/zoho/status",
      providesTags: ["Zoho"],
    }),

    getZohoOauthOrganizations: builder.query({
      query: (sessionId) => `/zoho/oauth/session/${encodeURIComponent(sessionId)}/organizations`,
    }),

    selectZohoOrganization: builder.mutation({
      query: (body) => ({
        url: "/zoho/oauth/select-organization",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Zoho"],
    }),

  }),
});

export const {
  useGetZohoStatusQuery,
  useGetZohoOauthOrganizationsQuery,
  useSelectZohoOrganizationMutation,
} = zohoApi;