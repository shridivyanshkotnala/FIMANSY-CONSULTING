import { useState, useMemo, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";

/*
  ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
  🔄 FUTURE: Replace with Redux RTK Query endpoint
  import { supabase } from "@/integrations/supabase/client";
*/

// ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux selectors / RTK Query hooks
import { useAuth } from "@/hooks/useAuth";

// ⚠️ CONTEXT API — useCompliance replaces direct supabase calls
// 🔄 FUTURE: Replace with Redux RTK Query endpoint for compliance
import { useCompliance } from "@/hooks/useCompliance";

import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ListChecks,
} from "lucide-react";

import {
  format,
  differenceInDays,
  isBefore,
  startOfDay,
} from "date-fns";

import { TicketDetailDrawer } from "./TicketDetailDrawer";

/*
  ==========================================================
  Static Config
  ==========================================================
*/

const CATEGORY_TAGS = [
  "GST",
  "TDS",
  "Income Tax",
  "MCA",
  "Payroll",
  "Other",
];

const ONGOING_STATUSES = [
  "initiated",
  "pending_docs",
  "in_progress",
  "filed",
  "overdue",
  "not_started",
];

const CLOSED_STATUSES = [
  "approved",
  "closed",
  "ignored",
];

const STATUS_CONFIG = {
  initiated: { label: "Initiated", className: "bg-primary/10 text-primary border-primary/20" },
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border-border" },
  pending_docs: { label: "Pending Docs", className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "In Progress", className: "bg-accent text-accent-foreground border-accent" },
  filed: { label: "Filed", className: "bg-success/10 text-success border-success/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  ignored: { label: "Ignored", className: "bg-muted text-muted-foreground border-border" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

/*
  ==========================================================
  Component
  ==========================================================
*/

export function ComplianceTracking() {

  const { organization } = useAuth();

  // ⚠️ CONTEXT API — useCompliance replaces direct supabase calls
  // 🔄 FUTURE: Replace with Redux RTK Query endpoint
  const { obligations, loading: complianceLoading } = useCompliance();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = startOfDay(new Date());

  /*
    ==========================================================
    Fetch Tickets
    ⚠️ SUPABASE REMOVED — now reads from useCompliance() hook
    🔄 FUTURE: Replace with RTK Query compliance endpoint
    ==========================================================
  */

  useEffect(() => {
    /*
      --- OLD SUPABASE CODE (COMMENTED, NOT REMOVED) ---
      const fetchTickets = async () => {
        const orgId = organization?.id || "7dc52afc-47c2-4ced-86c0-fc8c3131d78c";
        setLoading(true);
        try {
          const timeout = new Promise((r) => setTimeout(() => r("timeout"), 5000));
          const query = supabase
            .from("compliance_obligations")
            .select("*")
            .eq("organization_id", orgId)
            .order("due_date", { ascending: true });
          const result = await Promise.race([query, timeout]);
          if (result === "timeout" || result?.error) {
            setTickets([]);
          } else {
            setTickets(result?.data || []);
          }
        } catch {
          setTickets([]);
        } finally {
          setLoading(false);
        }
      };
      fetchTickets();
    */

    // Use data from useCompliance hook instead of direct Supabase call
    setTickets(Array.isArray(obligations) ? obligations : []);
    setLoading(complianceLoading);
  }, [obligations, complianceLoading]);

  /*
    ==========================================================
    Auto Mark Overdue
    ==========================================================
  */

  const processedTickets = useMemo(() => {
    return tickets.map((t) => {
      const due = new Date(t.due_date);

      if (
        isBefore(due, today) &&
        ONGOING_STATUSES.includes(t.status) &&
        t.status !== "filed"
      ) {
        return { ...t, status: "overdue" };
      }

      return t;
    });
  }, [tickets, today]);

  /*
    ==========================================================
    Filtering
    ==========================================================
  */

  const filteredTickets = useMemo(() => {

    return processedTickets.filter((t) => {

      if (searchQuery) {
        const q = searchQuery.toLowerCase();

        const matches =
          t.form_name?.toLowerCase().includes(q) ||
          t.financial_year?.toLowerCase().includes(q) ||
          t.ticket_number?.toLowerCase().includes(q) ||
          t.secondary_tag?.toLowerCase().includes(q);

        if (!matches) return false;
      }

      if (
        categoryFilter !== "all" &&
        t.primary_tag !== categoryFilter
      )
        return false;

      if (
        fyFilter !== "all" &&
        t.financial_year !== fyFilter
      )
        return false;

      if (
        statusFilter !== "all" &&
        t.status !== statusFilter
      )
        return false;

      return true;

    });

  }, [
    processedTickets,
    searchQuery,
    categoryFilter,
    fyFilter,
    statusFilter,
  ]);

  const ongoingTickets = filteredTickets.filter((t) =>
    ONGOING_STATUSES.includes(t.status)
  );

  const closedTickets = filteredTickets.filter((t) =>
    CLOSED_STATUSES.includes(t.status)
  );

  /*
    ==========================================================
    Metrics
    ==========================================================
  */

  const totalOngoing = processedTickets.filter((t) =>
    ONGOING_STATUSES.includes(t.status)
  ).length;

  const totalOverdue = processedTickets.filter(
    (t) => t.status === "overdue"
  ).length;

  const totalClosed = processedTickets.filter((t) =>
    CLOSED_STATUSES.includes(t.status)
  ).length;

  const onTimeRate =
    totalClosed > 0
      ? Math.round(
          (processedTickets.filter(
            (t) =>
              t.status === "approved" ||
              t.status === "closed"
          ).length /
            (totalClosed + totalOngoing)) *
            100
        )
      : 100;

  const uniqueFYs = [
    ...new Set(
      processedTickets
        .map((t) => t.financial_year)
        .filter(Boolean)
    ),
  ];

  /*
    ==========================================================
    Loading
    ==========================================================
  */

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /*
    ==========================================================
    Render
    ==========================================================
  */

  return (
    <div className="space-y-6">

      {/* ================= Metrics ================= */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ongoing</p>
                <p className="text-2xl font-bold">{totalOngoing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalOverdue > 0 ? "bg-destructive/10" : "bg-success/10"}`}>
                <AlertTriangle className={`h-5 w-5 ${totalOverdue > 0 ? "text-destructive" : "text-success"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{totalOverdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{totalClosed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-Time Rate</p>
                <p className="text-2xl font-bold">{onTimeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= Filters ================= */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by form name, FY, ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_TAGS.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fyFilter} onValueChange={setFyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="FY" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All FYs</SelectItem>
            {uniqueFYs.map((fy) => (
              <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ================= Tabs ================= */}
      <Tabs defaultValue="ongoing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ongoing" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Ongoing ({ongoingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Closed ({closedTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {ongoingTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No ongoing tickets</p>
                </div>
              ) : (
                ongoingTickets.map((t) => {
                  const daysUntil = differenceInDays(new Date(t.due_date), today);
                  const isOverdue = isBefore(new Date(t.due_date), today) && t.status !== "filed";
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.not_started;

                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer ${
                        isOverdue ? "border-l-4 border-l-destructive bg-destructive/5" : ""
                      }`}
                      onClick={() => { setSelectedTicket(t); setDrawerOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.form_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.form_description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                        <div className="text-right min-w-[70px]">
                          <p className="text-xs font-medium">
                            {t.due_date ? format(new Date(t.due_date), "dd MMM") : "—"}
                          </p>
                          <p className={`text-xs ${isOverdue ? "text-destructive" : daysUntil <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                            {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "Due today" : `${daysUntil}d left`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {closedTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No closed tickets</p>
                </div>
              ) : (
                closedTickets.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.closed;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer opacity-70"
                      onClick={() => { setSelectedTicket(t); setDrawerOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.form_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.form_description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {t.filing_date ? format(new Date(t.filing_date), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= Detail Drawer ================= */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedTicket(null);
        }}
      />
    </div>
  );
}