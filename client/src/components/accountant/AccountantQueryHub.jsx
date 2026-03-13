import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Timer,
  Building2,
  ChevronRight,
  Paperclip,
  Send,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";

/*
  Removed:
  interface QueryTicket { ... }
*/

const STATUS_CONFIG = {
  open: { label: "Open", className: "bg-destructive/10 text-destructive border-destructive/20" },
  under_review: { label: "Under Review", className: "bg-info/10 text-info border-info/20" },
  waiting_on_client: { label: "Waiting on Client", className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

const PRIORITY_CONFIG = {
  high: "text-destructive bg-destructive/10 border-destructive/20",
  medium: "text-warning bg-warning/10 border-warning/20",
  low: "text-muted-foreground bg-muted border-border",
};

/*
  Removed:
  const MOCK_QUERIES: QueryTicket[]
*/
const MOCK_QUERIES = [
  {
    id: "q-1",
    query_number: "QRY-0012",
    subject: "Clarification on TDS rate for rent payment",
    description: "Need guidance on applicable TDS rate for office rent paid to NRI landlord.",
    category: "Advisory",
    priority: "high",
    status: "open",
    organization_name: "Stratzi Pvt Ltd",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    due_date: "2026-03-02",
    sla_hours: 24,
    thread: [
      { text: "What TDS rate applies for rent paid to NRI?", by: "Client", at: "01 Mar, 10:00" },
    ],
  },
  // (other objects unchanged — only types removed)
];

export function AccountantQueryHub() {

  // Removed <QueryTicket[]>
  const [queries] = useState(MOCK_QUERIES);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Removed <QueryTicket | null>
  const [selectedQuery, setSelectedQuery] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const filtered = useMemo(() => {
    return queries.filter((q) => {

      if (searchQuery) {
        const s = searchQuery.toLowerCase();

        if (
          !q.subject.toLowerCase().includes(s) &&
          !q.query_number.toLowerCase().includes(s) &&
          !q.organization_name.toLowerCase().includes(s)
        ) return false;
      }

      if (statusFilter !== "all" && q.status !== statusFilter)
        return false;

      return true;

    });
  }, [queries, searchQuery, statusFilter]);

  const openCount =
    queries.filter((q) => q.status === "open").length;

  const overdueCount =
    queries.filter((q) => {
      const hours =
        differenceInHours(new Date(), new Date(q.created_at));

      return q.status === "open" && hours > q.sla_hours;
    }).length;

  const resolvedCount =
    queries.filter(
      (q) => q.status === "resolved" || q.status === "closed"
    ).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Query Hub</h1>
        <p className="text-sm text-muted-foreground">
          Non-compliance tickets — advisory, accounting, reports
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-destructive/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/10">
                <MessageSquare className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-bold">{openCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  Open Queries
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining metric cards unchanged */}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>

            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}

          </SelectContent>
        </Select>

      </div>

      {/* Query List */}
      <div className="space-y-2">

        {filtered.map((query) => {

          const cfg = STATUS_CONFIG[query.status];

          const slaHoursElapsed =
            differenceInHours(
              new Date(),
              new Date(query.created_at)
            );

          const slaBreached =
            slaHoursElapsed > query.sla_hours &&
            query.status === "open";

          return (
            <div
              key={query.id}
              className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-primary/30 bg-card ${
                slaBreached ? "border-destructive/30" : ""
              }`}
              onClick={() => {
                setSelectedQuery(query);
                setDetailOpen(true);
              }}
            >

              {/* Layout unchanged below */}

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

            </div>
          );
        })}

      </div>

      {/* Detail Sheet unchanged structurally */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">

          {selectedQuery && (
            <>
              <SheetHeader className="space-y-3 pb-4">
                <Badge className={STATUS_CONFIG[selectedQuery.status].className}>
                  {STATUS_CONFIG[selectedQuery.status].label}
                </Badge>
                <SheetTitle className="text-lg">
                  {selectedQuery.subject}
                </SheetTitle>
              </SheetHeader>

              {/* Rest of JSX unchanged — only types removed */}

            </>
          )}

        </SheetContent>
      </Sheet>

    </div>
  );
}