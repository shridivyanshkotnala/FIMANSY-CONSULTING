import { baseApi } from "./baseApi";

export const complianceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // =========================
    // DASHBOARD METRICS
    // =========================
    getDashboardMetrics: builder.query({
      query: () => ({
        url: "/accountant/dashboard-metrics",
        method: "GET",
      }),
      providesTags: ["Dashboard"],
      keepUnusedDataFor: 60,
    }),

    // =========================
    // ORGANIZATIONS LIST
    // =========================
    getOrganizations: builder.query({
      query: (params) => ({
        url: "/accountant/organizations",
        method: "GET",
        params,
      }),

      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return endpointName + JSON.stringify(queryArgs);
      },

      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((org) => ({
                type: "Organization",
                id: org.organization_id,
              })),
              { type: "OrganizationList", id: "LIST" },
            ]
          : [{ type: "OrganizationList", id: "LIST" }],

      keepUnusedDataFor: 30,
    }),

    // =========================
    // TICKET LIST
    // =========================
    getComplianceRequests: builder.query({
      query: (params) => ({
        url: "/accountant/compliance-requests",
        method: "GET",
        params,
      }),

      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return endpointName + JSON.stringify(queryArgs);
      },

      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((ticket) => ({
                type: "Ticket",
                id: ticket._id,
              })),
              { type: "TicketList", id: "LIST" },
            ]
          : [{ type: "TicketList", id: "LIST" }],

      keepUnusedDataFor: 30,
    }),

    // =========================
    // TICKET DETAIL
    // =========================
    getTicketById: builder.query({
      query: (ticketId) => ({
        url: `/accountant/compliance-requests/${ticketId}`,
        method: "GET",
      }),
      providesTags: (result, error, ticketId) => [
        { type: "Ticket", id: ticketId },
      ],
      keepUnusedDataFor: 60,
    }),

    // =========================
    // STATUS HISTORY
    // =========================
    getTicketStatusHistory: builder.query({
      query: (ticketId) => ({
        url: `/accountant/compliance-requests/${ticketId}/status-history`,
        method: "GET",
      }),
      // server response shape: { total, data }
      transformResponse: (response) => response.data || [],
      providesTags: (result, error, ticketId) => [
        { type: "TicketStatusHistory", id: ticketId },
      ],
      keepUnusedDataFor: 60,
    }),

    // =========================
    // COMMENTS
    // =========================
    getComments: builder.query({
      query: (ticketId) => ({
        url: `/accountant/compliance-requests/${ticketId}/comments`,
        method: "GET",
      }),
      // server response shape: { total, data }
      transformResponse: (response) => response.data || [],

      providesTags: (result, error, ticketId) => [
        { type: "Comment", id: ticketId },
      ],

      keepUnusedDataFor: 0,
    }),

    // =========================
    // META (SMART POLLING)
    // =========================
    getTicketMeta: builder.query({
      query: (ticketId) => ({
        url: `/accountant/compliance-requests/${ticketId}/meta`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    // =========================
    // POST COMMENT
    // =========================
    postComment: builder.mutation({
      query: ({ ticketId, body }) => ({
        url: `/accountant/compliance-requests/${ticketId}/comments`,
        method: "POST",
        body,
      }),

      async onQueryStarted(
        { ticketId, body },
        { dispatch, queryFulfilled }
      ) {
        const patch = dispatch(
          complianceApi.util.updateQueryData(
            "getComments",
            ticketId,
            (draft) => {
              const optimistic = {
                _id: "temp-id",
                message: body.message || body.content || "",
                attachments: body.attachments || [],
                author_role: "accountant",
                createdAt: new Date().toISOString(),
              };

              if (!Array.isArray(draft)) {
                return [optimistic];
              }

              draft.push(optimistic);
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },

      invalidatesTags: (result, error, { ticketId }) => [
        { type: "Comment", id: ticketId },
        { type: "Ticket", id: ticketId },
        { type: "TicketList", id: "LIST" },
      ],
    }),

    // =========================
    // MARK READ
    // =========================
    markTicketRead: builder.mutation({
      query: (ticketId) => ({
        url: `/accountant/compliance-requests/${ticketId}/mark-read`,
        method: "PATCH",
      }),

      invalidatesTags: (result, error, ticketId) => [
        { type: "Ticket", id: ticketId },
        { type: "TicketList", id: "LIST" },
      ],
    }),

    // =========================
    // UPDATE STATUS
    // =========================
    updateTicketStatus: builder.mutation({
      query: ({ ticketId, status }) => ({
        url: `/accountant/compliance-requests/${ticketId}/status`,
        method: "PATCH",
        body: { status },
      }),

      invalidatesTags: (result, error, { ticketId }) => [
        { type: "Ticket", id: ticketId },
        { type: "TicketList", id: "LIST" },
        { type: "TicketStatusHistory", id: ticketId },
        "Dashboard",
      ],
    }),

    // =========================
    // ORG DIRECTORS
    // =========================
    getOrgDirectors: builder.query({
      query: (orgId) => ({
        url: `/accountant/organizations/${orgId}/directors`,
        method: "GET",
      }),
      providesTags: (result, error, orgId) => [
        { type: "Organization", id: orgId },
      ],
      keepUnusedDataFor: 120,
    }),

    // =========================
    // ORG COMPANY PROFILE
    // =========================
    // Fetches CompanyComplianceProfile for a given org — CIN, GSTIN, PAN, TAN,
    // company_type, date_of_incorporation, registered_office_address, etc.
    getOrgCompanyProfile: builder.query({
      query: (orgId) => ({
        url: `/accountant/organizations/${orgId}/company`,
        method: "GET",
      }),
      providesTags: (result, error, orgId) => [
        { type: "Organization", id: orgId },
      ],
      keepUnusedDataFor: 120,
    }),

    // =========================
    // COMPLIANCE TEMPLATES (for Create Ticket dropdown)
    // =========================
    getComplianceTemplates: builder.query({
      query: () => ({
        url: "/accountant/compliance-templates",
        method: "GET",
      }),
      transformResponse: (response) => response.data || [],
      providesTags: ["ComplianceTemplate"],
      keepUnusedDataFor: 300, // templates rarely change
    }),

    // =========================
    // ALL ORGANIZATIONS (for Create Ticket dropdown)
    // =========================
    getAllOrganizations: builder.query({
      query: () => ({
        url: "/accountant/all-organizations",
        method: "GET",
      }),
      transformResponse: (response) => response.data || [],
      providesTags: [{ type: "OrganizationList", id: "ALL" }],
      keepUnusedDataFor: 60,
    }),

    // =========================
    // CREATE MANUAL TICKET
    // =========================
    createManualTicket: builder.mutation({
      query: (body) => ({
        url: "/accountant/compliance-requests/create",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "TicketList", id: "LIST" },
        "Dashboard",
        { type: "OrganizationList", id: "LIST" },
        { type: "OrganizationList", id: "ALL" },
      ],
    }),

  }),

  overrideExisting: false,
});

export const {
  useGetDashboardMetricsQuery,
  useGetOrganizationsQuery,
  useGetComplianceRequestsQuery,
  useGetTicketByIdQuery,
  useGetTicketStatusHistoryQuery,
  useGetCommentsQuery,
  useGetTicketMetaQuery,
  usePostCommentMutation,
  useMarkTicketReadMutation,
  useUpdateTicketStatusMutation,
  useGetOrgDirectorsQuery,
  useGetOrgCompanyProfileQuery,
  useGetComplianceTemplatesQuery,
  useGetAllOrganizationsQuery,
  useCreateManualTicketMutation,
} = complianceApi;