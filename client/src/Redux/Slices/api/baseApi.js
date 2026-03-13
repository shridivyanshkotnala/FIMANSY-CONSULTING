import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include",

  prepareHeaders: (headers, { getState }) => {
    const state = getState();

    const token = state.auth?.accessToken;
    const orgId = localStorage.getItem("activeOrgId");

    if (token) headers.set("authorization", `Bearer ${token}`);
    if (orgId) headers.set("x-organization-id", orgId);

    return headers;
  }
});


const baseQueryWithRefresh = async (args, api, extraOptions) => {
  try {
    let result = await rawBaseQuery(args, api, extraOptions);

    // access token expired → attempt refresh
    if (result?.error?.status === 401) {
      const refreshResult = await rawBaseQuery(
        { url: "/user/refresh-token", method: "POST" },
        api,
        extraOptions
      );

      if (refreshResult?.data) {
        // retry original request after refresh
        result = await rawBaseQuery(args, api, extraOptions);
      }

      // if refresh fails → DO NOTHING
      // AuthGuard will see /me = 401 and redirect to /auth
    }

    return result;
  } catch (err) {
    // Ensure we always return an object the RTK Query can consume
    console.debug("baseQueryWithRefresh caught error:", err);
    return { error: { status: err?.status || "FETCH_ERROR", data: err?.message || String(err) } };
  }
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["Auth", "Zoho", "Org", "Aging", "CashIntelligence", "Banking",
    "Dashboard",
    "Organization",
    "OrganizationList",
    "Ticket",
    "TicketList",
    "Comment",
    "TicketStatusHistory",
    "ComplianceTemplate",
  ],
  endpoints: () => ({}),
});
