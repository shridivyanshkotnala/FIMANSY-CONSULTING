import { useState } from "react";
// useMemo removed — all heavy data processing (filtering, sorting, health scores, counts) moved to backend

// === RTK QUERY: Backend data fetching hooks ===
import {
  useGetOrganizationsQuery,
  useGetComplianceRequestsQuery,
  useGetDashboardMetricsQuery,
  useGetOrgCompanyProfileQuery,  // added: fetches CompanyComplianceProfile for org detail Company tab
} from "@/Redux/Slices/api/complianceApi";

// === REDUX: UI state management (filters, sort, selected org, pagination) ===
import { useDispatch, useSelector } from "react-redux";
import {
  setSearchQuery,
  setOrgClassification,
  setOrgSort,
  setOrgPage,      // added: org list pagination
  setSelectedOrg,
  setTicketCategory,
  setTicketStatus,
  setTicketSort,
  setTicketPage,   // added: ticket list pagination
  setTicketLimit,   // added: ticket list pagination
  toggleClientUpdatesOnly,
  openDrawer,
} from "@/Redux/Slices/complianceSlice";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  Timer,
  ArrowUpDown,
  Building2,
  Eye,
  PlayCircle,
  FileQuestion,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { startOfDay } from "date-fns";
// differenceInDays, isBefore removed — overdue marking now done server-side
import { AccountantTicketDetail } from "./AccountantTicketDetail";

import { STATUS_CONFIG, ONGOING_STATUSES, CLOSED_STATUSES, CATEGORY_TAGS, HEALTH_COLORS } from "./compliancecomp/constants";
import { MetricCard } from "./compliancecomp/MetricCard";
import { OrgRow } from "./compliancecomp/OrgRow";
import { TicketRow } from "./compliancecomp/TicketRow";
import { OrgCompanyInfoTab } from "./compliancecomp/OrgCompanyInfoTab";
import { EmptyState } from "./compliancecomp/EmptyState";
import { CreateTicketModal } from "./compliancecomp/CreateTicketModal";

/* Removed:
   export interface AccountantTicket
   export interface OrgSummary
*/

/*
 * === MOCK TICKETS — COMMENTED OUT ===
 * Reason: All compliance ticket data now fetched from backend via
 *   useGetComplianceRequestsQuery (All Requests tab) and
 *   useGetOrganizationsQuery (Organizations tab).
 * These 7 items were temporary hardcoded entries used before backend was connected.
 *
 * const MOCK_TICKETS = [
 *   { id: "at-1", form_name: "GSTR-3B", organization_name: "Stratzi Pvt Ltd", status: "overdue", ... },
 *   { id: "at-2", form_name: "TDS Return – Q4", organization_name: "Nexora Solutions", status: "pending_docs", ... },
 *   { id: "at-3", form_name: "GST Annual Return", organization_name: "Stratzi Pvt Ltd", status: "in_progress", ... },
 *   { id: "at-4", form_name: "ROC Annual Filing", organization_name: "Stratzi Pvt Ltd", status: "filed", ... },
 *   { id: "at-5", form_name: "GSTR-3B", organization_name: "Nexora Solutions", status: "overdue", ... },
 *   { id: "at-6", form_name: "Income Tax Advance – Q4", organization_name: "Nexora Solutions", status: "approved", ... },
 *   { id: "at-7", form_name: "GSTR-1", organization_name: "Vanguard Retail", status: "initiated", ... },
 * ];
 * === END MOCK TICKETS ===
 */

/* Removed type OrgSortKey */
/* Removed type RequestSortKey */

/*
 * === LOCAL HEALTH COMPUTATION — COMMENTED OUT ===
 * Reason: Backend (healthEngine.js inside fetchOrganizationsSummary) now computes
 *   health_score (0-100) and health_status ("healthy" | "attention" | "critical")
 *   for each organization and returns them in the API response.
 *   These pure-JS functions are no longer needed on the client.
 *
 * function computeHealthScore(tickets, today) {
 *   let score = 100;
 *   tickets.forEach((t) => {
 *     if (t.status === "overdue") score -= 20;
 *     if (t.status === "pending_docs") {
 *       const daysPending = differenceInDays(today, new Date(t.updated_at));
 *       if (daysPending > 3) score -= 5;
 *     }
 *   });
 *   return Math.max(0, Math.min(100, score));
 * }
 *
 * function getHealthStatus(score) {
 *   if (score >= 80) return "healthy";
 *   if (score >= 50) return "attention";
 *   return "critical";
 * }
 * === END LOCAL HEALTH COMPUTATION ===
 */

export function AccountantComplianceEngine() {
  /*
   * === LOCAL STATE — COMMENTED OUT ===
   * Reason: All filter/sort/selection state migrated to Redux (complianceUi slice).
   *   searchQuery           → state.complianceUi.searchQuery          (setSearchQuery)
   *   selectedOrgId         → state.complianceUi.orgView.selectedOrgId (setSelectedOrg)
   *   reqCategoryFilter     → state.complianceUi.ticketView.category   (setTicketCategory)
   *   reqStatusFilter       → state.complianceUi.ticketView.status     (setTicketStatus)
   *   reqSortBy             → state.complianceUi.ticketView.sortBy     (setTicketSort)
   *   reqClientUpdateFilter → state.complianceUi.ticketView.clientUpdatesOnly (toggleClientUpdatesOnly)
   *   orgSortBy             → state.complianceUi.orgView.sortBy        (setOrgSort)
   *   orgClassification     → state.complianceUi.orgView.classification (setOrgClassification)
   *
   * const [tickets] = useState(MOCK_TICKETS);
   * const [searchQuery, setSearchQuery] = useState("");
   * const [selectedOrgId, setSelectedOrgId] = useState(null);
   * const [reqCategoryFilter, setReqCategoryFilter] = useState("all");
   * const [reqStatusFilter, setReqStatusFilter] = useState("all");
   * const [reqSortBy, setReqSortBy] = useState("overdue_first");
   * const [reqClientUpdateFilter, setReqClientUpdateFilter] = useState(false);
   * const [orgSortBy, setOrgSortBy] = useState("overdue");
   * const [orgClassification, setOrgClassification] = useState("all");
   * === END LOCAL STATE ===
   */

  // === REDUX: read all global UI state from the complianceUi slice ===
  const dispatch = useDispatch();
  const { searchQuery, orgView, ticketView } = useSelector((state) => state.complianceUi);
  const selectedOrgId = orgView.selectedOrgId; // shorthand alias for readability

  // Local state — ticket detail drawer (AccountantTicketDetail now driven by Redux drawer)
  /*
    Reason: drawer state (selectedTicketId + open) moved to Redux (complianceUi.drawer).
    Previously we stored `selectedTicket` and `detailOpen` locally and passed the full
    ticket object down to `AccountantTicketDetail`. The drawer is now opened via
    `dispatch(openDrawer(ticketId))` so `AccountantTicketDetail` will fetch its own
    detail using RTK Query. TheseLocal variables are preserved as commented lines
    for history and to make reviewing the change easier.
  */
  // const [selectedTicket, setSelectedTicket] = useState(null);
  // const [detailOpen, setDetailOpen] = useState(false);

  // Local state — org drill-down sub-filters (scoped to org detail view only, not persisted in Redux)
  const [orgDetailCategoryFilter, setOrgDetailCategoryFilter] = useState("all");
  const [orgDetailStatusFilter, setOrgDetailStatusFilter] = useState("all");

  // Local state — create ticket modal
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  // Local state — cache the selected org object at click time
  // Reason: orgSummaries may be filtered/paginated, so finding it later is unreliable
  const [selectedOrgData, setSelectedOrgData] = useState(null);

  const today = startOfDay(new Date());

  /*
   * === ALL LOCAL useMemos — COMMENTED OUT ===
   * Reason: Backend now handles all data processing (filtering, sorting, health, pagination).
   *   processed useMemo     → overdue marking done server-side
   *   overdueCount etc      → replaced by getDashboardMetrics API
   *   orgSummaries useMemo  → replaced by getOrganizations API
   *   filteredOrgs useMemo  → backend handles filtering + sorting
   *   classificationCounts  → computed from a separate all-orgs API call
   *   openTickets useMemo   → replaced by getComplianceRequests API
   *   selectedOrgTickets    → replaced by org-scoped getComplianceRequests call
   *   avgResolution mock    → replaced by getDashboardMetrics API
   *
   * const processed = useMemo(() => { ... }, [tickets, today]);
   * const overdueCount = processed.filter(...).length;
   * const pendingDocsCount = ...;
   * const inProgressCount = ...;
   * const filedCount = ...;
   * const closedThisMonth = ...;
   * const totalAll = processed.length;
   * const onTimeRate = ...;
   * const orgSummaries = useMemo(() => { ... }, [processed, today]);
   * const filteredOrgs = useMemo(() => { ... }, [orgSummaries, ...]);
   * const classificationCounts = useMemo(() => { ... }, [orgSummaries, searchQuery]);
   * const openTickets = useMemo(() => { ... }, [processed, ...]);
   * const selectedOrg = selectedOrgId ? orgSummaries.find(...) : null;
   * const selectedOrgTickets = useMemo(() => { ... }, [processed, selectedOrgId, ...]);
   * const avgResolution = "3.2d";
   * === END useMemos ===
   */

  // === TICKET FIELD NORMALIZER ===
  // Reason: Backend field names differ from what existing UI child components (TicketRow, OrgCompanyInfoTab)
  // already expect. This maps API response fields to the UI-expected shape without touching any child component.

  // category_tag backend enum (lowercase) → display labels used by TicketRow badge and filter dropdowns
  const CATEGORY_LABEL_MAP = {
    gst: "GST", tds: "TDS", income_tax: "Income Tax",
    mca: "MCA", payroll: "Payroll", other: "Other",
  };
  // category API map — UI dropdowns emit display labels ("GST"), backend filter expects lowercase enum ("gst")
  const CATEGORY_API_MAP = {
    GST: "gst", TDS: "tds", "Income Tax": "income_tax",
    MCA: "mca", Payroll: "payroll", Other: "other",
  };

  const normalizeTicket = (t) => ({
    ...t,
    id: t._id ?? t.id,
    // Flatten populated organization_id object → flat string fields
    organization_name: t.organization_id?.name ?? t.organization_name ?? "",
    cin:   t.organization_id?.cin   ?? t.cin,
    gstin: t.organization_id?.gstin ?? t.gstin,
    // form_name: backend stores form name as 'subtag' (e.g. "GSTR-3B") — TicketRow title field expects 'form_name'
    form_name: t.form_name ?? t.subtag ?? "",
    // form_description: lives on ComplianceObligation, returned via .populate("obligation_id") as obligation_id.form_description
    form_description: t.form_description ?? t.obligation_id?.form_description ?? "",
    // ticket_number: no field in ComplianceTicket schema — generate display ref from ObjectId last 4 chars
    ticket_number: t.ticket_number ?? `TKT-${String(t._id ?? t.id).slice(-4).toUpperCase()}`,
    // primary_tag: backend enum is lowercase ('gst') — map to display label expected by TicketRow badge ('GST')
    primary_tag: CATEGORY_LABEL_MAP[t.category_tag] ?? t.primary_tag ?? t.category_tag ?? "",
    secondary_tag: t.secondary_tag ?? t.subtag ?? "",
    has_client_update: t.has_client_update ?? t.has_unread_client_update ?? false,
  });

  // === DASHBOARD METRICS API ===
  // Replaces: overdueCount, pendingDocsCount, inProgressCount, filedCount,
  //           closedThisMonth, onTimeRate, avgResolution (all were computed from MOCK_TICKETS)
  const { data: metricsData } = useGetDashboardMetricsQuery();
  const overdueCount     = metricsData?.overdue_count      ?? 0;
  const pendingDocsCount = metricsData?.pending_docs_count ?? 0;
  const inProgressCount  = metricsData?.in_progress_count  ?? 0;
  const filedCount       = metricsData?.filed_count        ?? 0;
  const closedThisMonth  = metricsData?.closed_count       ?? 0;
  // null means no resolved tickets yet → show "—" instead of a fake number
  const onTimeRate       = metricsData?.on_time_percentage ?? null;
  const avgResolution    = metricsData?.avg_resolution_days != null
    ? `${metricsData.avg_resolution_days}d`
    : "—";

  // === ORGANIZATIONS API — filtered + sorted list for display ===
  // Replaces: orgSummaries useMemo + filteredOrgs useMemo
  const { data: orgResponse, isLoading: orgLoading } = useGetOrganizationsQuery({
    search:         searchQuery || undefined,
    classification: orgView.classification !== "all" ? orgView.classification : undefined,
    sort_by:        orgView.sortBy,
    page:           orgView.page,
    limit:          orgView.limit,
  });
  const orgSummaries = orgResponse?.data || [];
  // filteredOrgs is now the same as orgSummaries — backend already applied filter + sort
  const filteredOrgs = orgSummaries;

  // === ORGANIZATIONS API — separate unfiltered call for pill classification counts ===
  // Reason: the main orgResponse is filtered by classification, so it cannot give
  //         counts for OTHER classifications. This call fetches all orgs to derive counts.
  const { data: allOrgsForCounts } = useGetOrganizationsQuery({
    search:  searchQuery || undefined,
    sort_by: "overdue",
    limit:   100,
  });
  const _allOrgsData = allOrgsForCounts?.data || [];
  // Replaces: classificationCounts useMemo
  const classificationCounts = {
    all:          allOrgsForCounts?.total ?? _allOrgsData.length,
    overdue:      _allOrgsData.filter((o) => o.overdue_count > 0).length,
    upcoming:     _allOrgsData.filter((o) => o.upcoming_7d > 0).length,
    pending_docs: _allOrgsData.filter((o) => o.pending_docs_count > 0).length,
    no_upcoming:  _allOrgsData.filter((o) => o.upcoming_7d === 0 && o.overdue_count === 0 && o.total_active === 0).length,
  };

  // === COMPLIANCE REQUESTS API — All Requests tab ===
  // Replaces: openTickets useMemo (backend now handles category/status/sort/search/pagination)
  const { data: ticketResponse, isLoading: ticketLoading } = useGetComplianceRequestsQuery({
    search:              searchQuery || undefined,
    // Map display label ("GST") → backend enum ("gst") — CATEGORY_API_MAP defined above in normalizer section
    category:            ticketView.category !== "all" ? (CATEGORY_API_MAP[ticketView.category] ?? ticketView.category) : undefined,
    status:              ticketView.status   !== "all" ? ticketView.status   : undefined,
    client_updates_only: ticketView.clientUpdatesOnly || undefined,
    sort_by:             ticketView.sortBy,
    page:                ticketView.page,
    limit:               ticketView.limit,
  });
  // Normalize backend field names → UI component expected names
  const openTickets = (ticketResponse?.data || []).map(normalizeTicket);

  // === SELECTED ORG: use the object cached at click-time ===
  // Replaces: const selectedOrg = selectedOrgId ? orgSummaries.find(...) : null;
  // Reason: orgSummaries is filtered/paginated — the selected org may not be in the current page
  const selectedOrg = selectedOrgData;

  // === ORG DETAIL TICKETS API — fetches tickets scoped to the selected org ===
  // Replaces: selectedOrgTickets useMemo (was filtering the full processed[] array by organization_id)
  const { data: orgTicketResponse } = useGetComplianceRequestsQuery(
    { organization_id: selectedOrgId, limit: 100 },
    { skip: !selectedOrgId }
  );
  const orgTicketsRaw = (orgTicketResponse?.data || []).map(normalizeTicket);

  // === ORG COMPANY PROFILE API ===
  // Fetches CompanyComplianceProfile for the selected org (CIN, GSTIN, PAN, TAN, company_type, etc.)
  // Used by OrgCompanyInfoTab — skipped until an org is selected to avoid unnecessary requests
  const { data: companyProfileData } = useGetOrgCompanyProfileQuery(
    selectedOrgId,
    { skip: !selectedOrgId }
  );

  // Org detail sub-filters applied locally (scoped to drill-down, not worth an extra API round-trip)
  let selectedOrgTickets = orgTicketsRaw;
  if (orgDetailCategoryFilter !== "all") selectedOrgTickets = selectedOrgTickets.filter((t) => t.primary_tag === orgDetailCategoryFilter);
  if (orgDetailStatusFilter   !== "all") selectedOrgTickets = selectedOrgTickets.filter((t) => t.status     === orgDetailStatusFilter);

  return (
    <div className="space-y-6 p-6">

      {/* ===== TITLE ===== */}
      <div>
        <h1 className="text-2xl font-bold">Compliance Control Center</h1>
        <p className="text-sm text-muted-foreground">Client portfolio &amp; execution queue</p>
      </div>

      {/* ===== METRIC CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard icon={AlertTriangle} label="Overdue" value={overdueCount} variant="destructive" />
        <MetricCard icon={FileText} label="Pending Docs" value={pendingDocsCount} variant="warning" />
        <MetricCard icon={PlayCircle} label="In Progress" value={inProgressCount} variant="info" />
        <MetricCard icon={CheckCircle2} label="Filed" value={filedCount} variant="success" />
        <MetricCard icon={Clock} label="Closed" value={closedThisMonth} variant="success" />
        <MetricCard icon={Timer} label="Avg Resolution" value={avgResolution} variant="default" />
        <MetricCard icon={TrendingUp} label="On-Time %" value={onTimeRate != null ? `${onTimeRate}%` : "—"} variant="default" />
      </div>

      {/* ===== SEARCH BAR (full width) ===== */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search org name, CIN, compliance type, financial year, ticket ID..."
          className="pl-10 h-11 text-sm"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
        />
      </div>

      {/* ===== TABS: All Organizations / Compliance Requests ===== */}
      <Tabs defaultValue="by_org" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by_org" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            All Organizations ({orgResponse?.total ?? orgSummaries.length})
          </TabsTrigger>
          <TabsTrigger value="all_requests" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Compliance Requests ({ticketResponse?.total ?? openTickets.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: By Organization ===== */}
        <TabsContent value="by_org" className="space-y-4">
          {selectedOrgId && selectedOrg ? (
            /* ---- Org Detail View ---- */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dispatch(setSelectedOrg(null)); // clear Redux org selection
                    setSelectedOrgData(null);       // clear cached org object
                    setOrgDetailCategoryFilter("all");
                    setOrgDetailStatusFilter("all");
                  }}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{selectedOrg.organization_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrg.total_active} active · {selectedOrg.overdue_count} overdue · Health: {Math.round(selectedOrg.health_score ?? 0)}%
                  </p>
                </div>
                {/* Health status badge — top-right, matches ideal UI org detail header (images 2-3) */}
                {selectedOrg.health_status && (
                  <Badge className={`${HEALTH_COLORS[selectedOrg.health_status]?.bg} ${HEALTH_COLORS[selectedOrg.health_status]?.text} border-0 text-xs font-medium`}>
                    {HEALTH_COLORS[selectedOrg.health_status]?.label} ({Math.round(selectedOrg.health_score ?? 0)})
                  </Badge>
                )}
              </div>

              {/* ===== ORG DETAIL STAT CARDS ===== */}
              {/* Mirrors the 4-card metric grid in ideal UI images 2-3 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={FileText}
                  label="Total This FY"
                  value={(selectedOrg.total_active ?? 0) + (selectedOrg.filed_count ?? 0) + (selectedOrg.closed_count ?? 0)}
                  variant="default"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Filed On Time %"
                  value={selectedOrg.filed_on_time_pct != null ? `${selectedOrg.filed_on_time_pct}%` : "—"}
                  variant="default"
                />
                <MetricCard icon={AlertTriangle} label="Overdue" value={selectedOrg.overdue_count ?? 0} variant="destructive" />
                <MetricCard icon={FileQuestion} label="Pending Docs" value={selectedOrg.pending_docs_count ?? 0} variant="warning" />
              </div>

              <Tabs defaultValue="ongoing" className="space-y-3">
                <TabsList className="grid w-full grid-cols-3 text-xs">
                  <TabsTrigger value="ongoing">
                    <Timer className="h-3 w-3 mr-1" />
                    Ongoing ({selectedOrgTickets.filter((t) => ONGOING_STATUSES.includes(t.status)).length})
                  </TabsTrigger>
                  <TabsTrigger value="closed">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Closed ({selectedOrgTickets.filter((t) => CLOSED_STATUSES.includes(t.status)).length})
                  </TabsTrigger>
                  <TabsTrigger value="company">
                    <Building2 className="h-3 w-3 mr-1" />
                    Company
                  </TabsTrigger>
                </TabsList>

                {/* Org detail filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={orgDetailCategoryFilter} onValueChange={setOrgDetailCategoryFilter}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORY_TAGS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={orgDetailStatusFilter} onValueChange={setOrgDetailStatusFilter}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="ongoing" className="space-y-2">
                  {selectedOrgTickets.filter((t) => ONGOING_STATUSES.includes(t.status)).length === 0 ? (
                    <EmptyState message="No ongoing tickets" />
                  ) : (
                    selectedOrgTickets.filter((t) => ONGOING_STATUSES.includes(t.status)).map((t) => (
                      <TicketRow
                        key={t.id}
                        ticket={t}
                        today={today}
                        onSelect={() => {
                          // Open the drawer via Redux so the detail component can fetch data itself
                          dispatch(openDrawer(t.id || t._id));
                        }}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="closed" className="space-y-2">
                  {selectedOrgTickets.filter((t) => CLOSED_STATUSES.includes(t.status)).length === 0 ? (
                    <EmptyState message="No closed tickets" />
                  ) : (
                    selectedOrgTickets.filter((t) => CLOSED_STATUSES.includes(t.status)).map((t) => (
                      <TicketRow
                        key={t.id}
                        ticket={t}
                        today={today}
                        onSelect={() => {
                          // Open the drawer via Redux so the detail component can fetch data itself
                          dispatch(openDrawer(t.id || t._id));
                        }}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="company">
                  {/* companyProfileData: from GET /accountant/organizations/:orgId/company API */}
                  <OrgCompanyInfoTab
                    orgTickets={orgTicketsRaw}
                    companyProfile={companyProfileData}
                    orgName={selectedOrg?.organization_name}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* ---- Org List View ---- */
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Classification pill buttons */}
                {[
                  { key: "all", label: "All", icon: Building2, count: classificationCounts.all },
                  { key: "overdue", label: "Overdue", icon: AlertTriangle, count: classificationCounts.overdue },
                  { key: "upcoming", label: "Upcoming Dues", icon: Clock, count: classificationCounts.upcoming },
                  { key: "pending_docs", label: "Pending Docs", icon: FileQuestion, count: classificationCounts.pending_docs },
                  // no_upcoming removed — classification removed per user request
                ].map((pill) => (
                  <Button
                    key={pill.key}
                    variant={orgView.classification === pill.key ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-full"
                    onClick={() => dispatch(setOrgClassification(pill.key))}
                  >
                    <pill.icon className="h-3 w-3" />
                    {pill.label}
                    <Badge
                      variant={orgView.classification === pill.key ? "secondary" : "outline"}
                      className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px] rounded-full"
                    >
                      {pill.count}
                    </Badge>
                  </Button>
                ))}


              </div>

              {filteredOrgs.length === 0 ? (
                <EmptyState message="No organizations match your filters" />
              ) : (
                <div className="space-y-2">
                  {filteredOrgs.map((org) => (
                    <OrgRow
                      key={org.organization_id}
                      org={org}
                      onClick={() => {
                        dispatch(setSelectedOrg(org.organization_id)); // update Redux
                        setSelectedOrgData(org);                       // cache org object for detail header
                      }}
                    />
                  ))}
                </div>
              )}

              {/* ===== PAGINATION — Org List ===== */}
              {(orgResponse?.total_pages ?? 1) > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Page {orgView.page} of {orgResponse.total_pages} &middot; {orgResponse.total} organizations
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                      disabled={orgView.page <= 1}
                      onClick={() => dispatch(setOrgPage(orgView.page - 1))}
                    >
                      &larr; Prev
                    </Button>
                    {Array.from({ length: orgResponse.total_pages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - orgView.page) <= 2)
                      .map((p) => (
                        <Button
                          key={p}
                          variant={p === orgView.page ? "default" : "outline"}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => dispatch(setOrgPage(p))}
                        >
                          {p}
                        </Button>
                      ))}
                    <Button
                      variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                      disabled={orgView.page >= (orgResponse?.total_pages ?? 1)}
                      onClick={() => dispatch(setOrgPage(orgView.page + 1))}
                    >
                      Next &rarr;
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== TAB: All Requests ===== */}
        <TabsContent value="all_requests" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={ticketView.category} onValueChange={(v) => dispatch(setTicketCategory(v))}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_TAGS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ticketView.status} onValueChange={(v) => dispatch(setTicketStatus(v))}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ticketView.sortBy} onValueChange={(v) => dispatch(setTicketSort(v))}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overdue_first">Overdue First</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={ticketView.clientUpdatesOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => dispatch(toggleClientUpdatesOnly())}
            >
              <Eye className="h-3 w-3" />
              Client Updates
            </Button>

            <span className="text-xs text-muted-foreground">
              {ticketResponse?.total ?? openTickets.length} request{(ticketResponse?.total ?? openTickets.length) !== 1 ? "s" : ""}
            </span>

            {/* ─── CREATE TICKET BUTTON ─── */}
            <Button
              size="sm"
              className="ml-auto h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90"
              onClick={() => setCreateTicketOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Ticket
            </Button>
          </div>

          {openTickets.length === 0 ? (
            <EmptyState message="No requests match your filters" />
          ) : (
            <div className="space-y-2">
              {openTickets.map((t) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  today={today}
                  showOrg
                  onSelect={() => {
                    // Open drawer through Redux so the detail sheet can fetch its own data
                    dispatch(openDrawer(t.id || t._id));
                  }}
                />
              ))}
            </div>
          )}

          {/* ===== PAGINATION — Compliance Requests ===== */}
          {(ticketResponse?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Page {ticketView.page} of {ticketResponse.pages} &middot; {ticketResponse.total} requests
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                  disabled={ticketView.page <= 1}
                  onClick={() => dispatch(setTicketPage(ticketView.page - 1))}
                >
                  &larr; Prev
                </Button>
                {Array.from({ length: ticketResponse.pages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - ticketView.page) <= 2)
                  .map((p) => (
                    <Button
                      key={p}
                      variant={p === ticketView.page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => dispatch(setTicketPage(p))}
                    >
                      {p}
                    </Button>
                  ))}
                <Button
                  variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                  disabled={ticketView.page >= (ticketResponse?.pages ?? 1)}
                  onClick={() => dispatch(setTicketPage(ticketView.page + 1))}
                >
                  Next &rarr;
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== TICKET DETAIL SHEET ===== */}
      {/*
        AccountantTicketDetail is now data-driven: it reads `selectedTicketId` and `open`
        from Redux (state.complianceUi.drawer) and uses RTK Query hooks to fetch its data.
        We leave this parent integration minimal; if parent needs to react to status changes
        it can do so via the `onStatusChange` callback. The previous props and local state
        are commented above instead of removed to keep code history visible and explain the change.
      */}
      <AccountantTicketDetail
        onStatusChange={(ticketId, newStatus) => {
          // Intentionally left blank; RTK Query invalidations will update ticket lists.
        }}
      />

      {/* ===== CREATE TICKET MODAL ===== */}
      <CreateTicketModal
        open={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
      />
    </div>
  );
}
