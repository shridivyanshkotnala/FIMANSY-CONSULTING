import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include", // cookies carry auth automatically
});

const baseQueryWithRefresh = async (args, api, extraOptions) => {
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
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["Auth","Zoho","Aging","CashIntelligence"],
  endpoints: () => ({}),
});
