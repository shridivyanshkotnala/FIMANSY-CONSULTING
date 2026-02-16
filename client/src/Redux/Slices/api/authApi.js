import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // ---------------- LOGIN ----------------
    login: builder.mutation({
      query: (credentials) => ({
        url: "/user/login",
        method: "POST",
        body: credentials,
      }),
      // after login -> refetch current user
      invalidatesTags: ["Auth"],
    }),

    // ---------------- SIGNUP ----------------
    signup: builder.mutation({
      query: (body) => ({
        url: "/user/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    // ---------------- CURRENT USER ----------------
    // This becomes your global auth state
    me: builder.query({
      query: () => "/user/me",
      providesTags: ["Auth"],
      transformResponse: (response) => response.data,

      // always accurate auth (no ghost login)
      keepUnusedDataFor: 0,

      // optional: retry once if network glitch
      extraOptions: { maxRetries: 1 },
    }),

    // ---------------- LOGOUT ----------------
    logout: builder.mutation({
      query: () => ({
        url: "/user/logout",
        method: "POST",
      }),

      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // wipe every cached API response (VERY IMPORTANT)
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    completeOnboarding: builder.mutation({
      query: (companyName) => ({
        url: "/user/onboarding",
        method: "POST",
        body: { companyName },
      }),
      invalidatesTags: ["Auth"],
    }),

  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useMeQuery,
  useLogoutMutation,
  useCompleteOnboardingMutation
} = authApi;
