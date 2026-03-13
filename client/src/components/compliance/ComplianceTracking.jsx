import { useState, useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";

import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";

import {
  Search,
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

import { CreateTicketModal } from "./CreateTicketModal";
import { TicketDetailDrawer } from "./TicketDetailDrawer";

/* ---------------------------------------------------- */
/* Config */
/* ---------------------------------------------------- */

const CATEGORY_TAGS = ["gst", "tds", "income_tax", "payroll", "mca"];

const STATUS = {
  not_started: { label: "Not Started", class: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", class: "bg-accent text-accent-foreground" },
  filed: { label: "Filed", class: "bg-success/10 text-success" },
  overdue: { label: "Overdue", class: "bg-destructive/10 text-destructive" },
  not_applicable: { label: "N/A", class: "bg-muted text-muted-foreground" },
};

const ONGOING = ["not_started", "in_progress", "overdue"];
const CLOSED = ["filed", "not_applicable"];

/* ---------------------------------------------------- */
/* Component */
/* ---------------------------------------------------- */

export function ComplianceTracking() {
  const { obligations = [], loading: complianceLoading } = useCompliance();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [fy, setFY] = useState("all");
  const [status, setStatus] = useState("all");

  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = startOfDay(new Date());

  /* ------------------------------ */
  /* Process obligations with overdue logic */
  /* ------------------------------ */

  const tickets = useMemo(() => {
    // Ensure obligations is an array
    const obligationsArray = Array.isArray(obligations) ? obligations : [];
    
    return obligationsArray.map((obligation) => {
      const due = obligation.due_date ? new Date(obligation.due_date) : null;

      // Mark as overdue if past due and not filed/completed
      if (
        due &&
        isBefore(due, today) &&
        obligation.status === "not_started"
      ) {
        return { ...obligation, status: "overdue" };
      }

      return obligation;
    });
  }, [obligations, today]);

  /* ------------------------------ */
  /* Filtering */
  /* ------------------------------ */

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      // Search filter - search in relevant fields
      if (search) {
        const q = search.toLowerCase();
        const searchableFields = [
          t.form_name,
          t.form_description,
          t.compliance_category,
          t.compliance_subtype,
          t.compliance_description,
          t.financial_year,
          t.srn_number,
          t.acknowledgement_number,
          t.notes,
        ].filter(Boolean).map(field => field.toLowerCase());
        
        const matches = searchableFields.some(field => field.includes(q));
        if (!matches) return false;
      }

      // Category filter
      if (category !== "all" && t.compliance_category !== category) return false;
      
      // Financial year filter
      if (fy !== "all" && t.financial_year !== fy) return false;
      
      // Status filter
      if (status !== "all" && t.status !== status) return false;

      return true;
    });
  }, [tickets, search, category, fy, status]);

  const ongoing = filtered.filter((t) => ONGOING.includes(t.status));
  const closed = filtered.filter((t) => CLOSED.includes(t.status));

  /* ------------------------------ */
  /* Metrics */
  /* ------------------------------ */

  const metrics = useMemo(() => {
    const overdue = tickets.filter((t) => t.status === "overdue").length;
    const closedCount = tickets.filter((t) => CLOSED.includes(t.status)).length;
    const ongoingCount = tickets.filter((t) => ONGOING.includes(t.status)).length;

    const onTime = closedCount > 0
      ? Math.round((tickets.filter((t) => t.status === "filed").length / closedCount) * 100)
      : 100;

    return {
      ongoing: ongoingCount,
      overdue,
      closed: closedCount,
      onTime,
    };
  }, [tickets]);

  const fyOptions = [...new Set(tickets.map((t) => t.financial_year).filter(Boolean))];

  /* ------------------------------ */
  /* Loading */
  /* ------------------------------ */

  if (complianceLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* ------------------------------ */
  /* Render */
  /* ------------------------------ */

  return (
    <div className="space-y-6">
      <Metrics metrics={metrics} />

      <Filters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        fy={fy}
        setFY={setFY}
        status={status}
        setStatus={setStatus}
        fyOptions={fyOptions}
      />

      <Tabs defaultValue="ongoing">
        <TabsList>
          <TabsTrigger value="ongoing">
            Ongoing ({ongoing.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing">
          <TicketList 
            tickets={ongoing} 
            today={today} 
            onClick={(ticket) => {
              setSelected(ticket);
              setDrawerOpen(true);
            }} 
          />
        </TabsContent>

        <TabsContent value="closed">
          <TicketList 
            tickets={closed} 
            today={today} 
            onClick={(ticket) => {
              setSelected(ticket);
              setDrawerOpen(true);
            }} 
          />
        </TabsContent>
      </Tabs>

      <TicketDetailDrawer
        ticket={selected}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------- */
/* Metrics */
/* ---------------------------------------------------- */

function Metrics({ metrics }) {
  const items = [
    { icon: ListChecks, label: "Ongoing", value: metrics.ongoing },
    { icon: AlertTriangle, label: "Overdue", value: metrics.overdue },
    { icon: CheckCircle2, label: "Closed", value: metrics.closed },
    { icon: TrendingUp, label: "On-Time Rate", value: `${metrics.onTime}%` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------- */
/* Filters */
/* ---------------------------------------------------- */

function Filters({
  search,
  setSearch,
  category,
  setCategory,
  fy,
  setFY,
  status,
  setStatus,
  fyOptions,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by form name, category, FY..."
          className="pl-9"
        />
      </div>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORY_TAGS.map((c) => (
            <SelectItem key={c} value={c}>
              {c.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fy} onValueChange={setFY}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="FY" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All FYs</SelectItem>
          {fyOptions.map((f) => (
            <SelectItem key={f} value={f}>
              FY {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {Object.entries(STATUS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------------------------------------------------- */
/* Ticket List */
/* ---------------------------------------------------- */

function TicketList({ tickets, today, onClick }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No obligations found
          </div>
        ) : (
          tickets.map((t) => {
            const due = t.due_date ? new Date(t.due_date) : null;
            const days = due ? differenceInDays(due, today) : null;
            const isOverdue = t.status === "overdue" || (due && isBefore(due, today) && t.status === "not_started");
            const status = STATUS[t.status] || STATUS.not_started;

            // Display name - prefer form_name if available, otherwise use category/subtype
            const displayName = t.form_name || 
              (t.compliance_subtype 
                ? `${t.compliance_category?.toUpperCase()} - ${t.compliance_subtype}`
                : t.compliance_category?.toUpperCase() || "Compliance");

            return (
              <div
                key={t._id}
                onClick={() => onClick(t)}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.form_description || t.compliance_description || `FY: ${t.financial_year || "N/A"}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {status && (
                    <Badge className={`text-xs ${status.class}`}>
                      {status.label}
                    </Badge>
                  )}

                  {due && (
                    <div className="text-right text-xs">
                      <p>{format(due, "dd MMM")}</p>
                      <p className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </p>
                    </div>
                  )}

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}