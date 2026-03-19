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

import { useTickets } from "@/hooks/useTickets";

import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Ticket,
} from "lucide-react";

import {
  format,
  differenceInDays,
  isBefore,
  startOfDay,
} from "date-fns";

import { TicketDetailDrawer } from "./TicketDetailDrawer/TicketDetailDrawer";

/* ---------------------------------------------------- */
/* Config */
/* ---------------------------------------------------- */

const CATEGORY_TAGS = ["gst", "tds", "income_tax", "payroll", "mca"];

const STATUS = {
  not_started: { label: "Not Started", class: "bg-muted text-muted-foreground" },
  initiated: { label: "Initiated", class: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", class: "bg-accent text-accent-foreground" },
  pending_docs: { label: "Pending Docs", class: "bg-yellow-100 text-yellow-800" },
  filed: { label: "Filed", class: "bg-success/10 text-success" },
  approved: { label: "Approved", class: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", class: "bg-destructive/10 text-destructive" },
  closed: { label: "Closed", class: "bg-gray-100 text-gray-800" },
  not_applicable: { label: "N/A", class: "bg-muted text-muted-foreground" },
};

const ONGOING = ["initiated", "in_progress", "pending_docs", "not_started", "overdue"];
const CLOSED = ["filed", "approved", "closed", "not_applicable"];

/* ---------------------------------------------------- */
/* Component */
/* ---------------------------------------------------- */

export function ComplianceTracking() {
  // ✅ USE THE REAL TICKETS FROM THE HOOK
  const { tickets = [], loading: ticketsLoading, refetchTickets } = useTickets();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [fy, setFY] = useState("all");
  const [status, setStatus] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = startOfDay(new Date());

  const currentFinancialYear = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }, []);

  /* ------------------------------ */
  /* Filter tickets */
  /* ------------------------------ */

  const filtered = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];

    return tickets.filter((ticket) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matches = 
          ticket.ticket_number?.toLowerCase().includes(q) ||
          ticket.compliance_subtype?.toLowerCase().includes(q) ||
          ticket.compliance_category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Category filter
      if (category !== 'all' && ticket.compliance_category !== category) return false;

      // Financial year filter
      if (fy !== 'all' && ticket.financial_year !== fy) return false;

      // Status filter
      if (status !== 'all' && ticket.status !== status) return false;

      return true;
    });
  }, [tickets, search, category, fy, status]);

  const ongoing = filtered.filter(ticket => ONGOING.includes(ticket.status));
  const closed = filtered.filter(ticket => CLOSED.includes(ticket.status));
  const accountantUpdates = filtered.filter(
    (ticket) => Boolean(ticket.has_unread_accountant_update)
  );

  /* ------------------------------ */
  /* Metrics */
  /* ------------------------------ */

  const metrics = useMemo(() => {
    const allTickets = tickets || [];
    
    return {
      ongoing: allTickets.filter(t => ONGOING.includes(t.status)).length,
      overdue: allTickets.filter(t => t.status === 'overdue').length,
      closed: allTickets.filter(t => CLOSED.includes(t.status)).length,
      total: allTickets.length,
    };
  }, [tickets]);

  const fyOptions = useMemo(() => {
    const values = new Set(
      (tickets || []).map((t) => t.financial_year).filter(Boolean)
    );
    values.add(currentFinancialYear);

    return [...values].sort((a, b) => {
      const aStart = Number(String(a).split("-")[0]) || 0;
      const bStart = Number(String(b).split("-")[0]) || 0;
      return bStart - aStart;
    });
  }, [tickets, currentFinancialYear]);

  /* ------------------------------ */
  /* Handlers */
  /* ------------------------------ */

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const handleDrawerClose = (open) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedTicket(null);
      refetchTickets();
    }
  };

  /* ------------------------------ */
  /* Loading */
  /* ------------------------------ */

  if (ticketsLoading) {
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
          <TabsTrigger value="accountant_updates">
            Accountant Updates ({accountantUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing">
          <TicketList 
            tickets={ongoing} 
            today={today} 
            onClick={handleTicketClick} 
          />
        </TabsContent>

        <TabsContent value="accountant_updates">
          <TicketList
            tickets={accountantUpdates}
            today={today}
            onClick={handleTicketClick}
          />
        </TabsContent>

        <TabsContent value="closed">
          <TicketList 
            tickets={closed} 
            today={today} 
            onClick={handleTicketClick} 
          />
        </TabsContent>
      </Tabs>

      <TicketDetailDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
      />
    </div>
  );
}

/* ---------------------------------------------------- */
/* Metrics Component */
/* ---------------------------------------------------- */

function Metrics({ metrics }) {
  const items = [
    { icon: ListChecks, label: "Total Tickets", value: metrics.total },
    { icon: Ticket, label: "Ongoing", value: metrics.ongoing },
    { icon: AlertTriangle, label: "Overdue", value: metrics.overdue },
    { icon: CheckCircle2, label: "Closed", value: metrics.closed },
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
/* Filters Component */
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
          placeholder="Search by ticket number, category..."
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
/* Ticket List Component */
/* ---------------------------------------------------- */

function TicketList({ tickets, today, onClick }) {
  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            No tickets found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        {tickets.map((ticket) => {
          const due = ticket.due_date ? new Date(ticket.due_date) : null;
          const days = due ? differenceInDays(due, today) : null;
          const isOverdue = ticket.status === "overdue";
          const status = STATUS[ticket.status] || STATUS.not_started;

          // Determine display name
          const displayName = ticket.compliance_subtype 
            ? `${ticket.compliance_category?.toUpperCase()} - ${ticket.compliance_subtype}`
            : ticket.compliance_category?.toUpperCase() || "Compliance Ticket";

          return (
            <div
              key={ticket._id}
              onClick={() => onClick(ticket)}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {displayName}
                  </p>
                  {ticket.has_unread_accountant_update && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                      Accountant Update
                    </Badge>
                  )}
                  {ticket.template_id && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50">
                      Conditional
                    </Badge>
                  )}
                  {ticket.ticket_number && (
                    <span className="text-xs text-muted-foreground">
                      #{ticket.ticket_number}
                    </span>
                  )}
                </div>
                
                {/* Additional metadata */}
                <div className="flex items-center gap-3 mt-1">
                  {ticket.compliance_category && (
                    <span className="text-xs text-muted-foreground">
                      {ticket.compliance_category.toUpperCase()}
                    </span>
                  )}
                  {ticket.financial_year && (
                    <span className="text-xs text-muted-foreground">
                      FY: {ticket.financial_year}
                    </span>
                  )}
                </div>
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
        })}
      </CardContent>
    </Card>
  );
}