import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearAuth, setTokens } from "../authSlice";

const PROD_API_FALLBACK = "https://fimansy-consulting.onrender.com/api";
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? PROD_API_FALLBACK : "/api");

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",

  prepareHeaders: (headers, { getState }) => {
    const state = getState();

    const token =
      state.auth?.accessToken ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("accessToken")
        : null);
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
      const state = api.getState();
      const refreshToken =
        state.auth?.refreshToken ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("refreshToken")
          : null);

      const refreshResult = await rawBaseQuery(
        {
          url: "/user/refresh-token",
          method: "POST",
          headers: refreshToken ? { "x-refresh-token": refreshToken } : undefined,
        },
        api,
        extraOptions
      );

      const refreshedAccessToken = refreshResult?.data?.data?.accessToken;
      const refreshedRefreshToken = refreshResult?.data?.data?.refreshToken;

      if (refreshedAccessToken) {
        api.dispatch(
          setTokens({
            accessToken: refreshedAccessToken,
            refreshToken: refreshedRefreshToken,
          })
        );

        // retry original request after refresh
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearAuth());
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
    "TicketDocument",
    "CompanyDocument",
    "OrgReconciliationQuery",
  ],
  endpoints: () => ({}),
});
