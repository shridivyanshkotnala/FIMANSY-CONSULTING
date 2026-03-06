// React
import { useMemo, useState } from "react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Data Source
import { useCompliance } from "@/hooks/useCompliance";

// Utility Functions
import {
  getDaysUntilDue,
  getCompliancePriority,
} from "@/lib/compliance/utils";

// Date Utilities
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  parseISO,
  isPast,
  isToday,
} from "date-fns";

// Icons
import {
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function ComplianceCalendar() {
  const { obligations, loading } = useCompliance();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Summary stats across all obligations
  const stats = useMemo(() => {
    const filed = obligations.filter((ob) => ob.status === "filed").length;
    const overdue = obligations.filter(
      (ob) =>
        ob.status !== "filed" &&
        ob.due_date &&
        isPast(parseISO(ob.due_date)) &&
        !isToday(parseISO(ob.due_date))
    ).length;
    
    return {
      total: obligations.length,
      filed,
      overdue,
      pending: obligations.length - filed - overdue,
    };
  }, [obligations]);

  // 🔴 FIXED: Get ALL obligations for the calendar grid
  const obligationsByDate = useMemo(() => {
    const grouped = {};
    
    obligations.forEach((ob) => {
      if (!ob.due_date) return;
      const date = parseISO(ob.due_date);
      const key = format(date, "yyyy-MM-dd");
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ob);
    });
    
    return grouped;
  }, [obligations]);

  // Keep this for the monthly list
  const monthObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (!ob.due_date) return false;
      const d = parseISO(ob.due_date);
      return d >= monthStart && d <= monthEnd;
    });
  }, [obligations, monthStart, monthEnd]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "filed":
        return <Badge className="bg-success/10 text-success text-xs">Filed</Badge>;
      case "in_progress":
        return <Badge className="bg-info/10 text-info text-xs">In Progress</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getDayClass = (date) => {
    const key = format(date, "yyyy-MM-dd");
    const dayObs = obligationsByDate[key];
    if (!dayObs?.length) return "";

    const hasOverdue = dayObs.some(
      (ob) => ob.status === "overdue" || getDaysUntilDue(ob.due_date) < 0
    );
    const hasUrgent = dayObs.some(
      (ob) => getDaysUntilDue(ob.due_date) <= 3 && ob.status !== "filed"
    );
    const allFiled = dayObs.every((ob) => ob.status === "filed");

    if (hasOverdue) return "bg-destructive/20 text-destructive font-bold";
    if (hasUrgent) return "bg-warning/20 text-warning font-bold";
    if (allFiled) return "bg-success/20 text-success";
    return "bg-primary/20 text-primary";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Compliance Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance Calendar
            </CardTitle>
            <CardDescription>Track statutory filing deadlines</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Total", value: stats.total, color: "text-primary" },
            { label: "Filed", value: stats.filed, color: "text-success" },
            { label: "Pending", value: stats.pending, color: "text-warning" },
            { label: "Overdue", value: stats.overdue, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayObs = obligationsByDate[key];
            const isCurrentDay = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={cn(
                  "h-12 flex flex-col items-center justify-center rounded-lg transition-colors relative cursor-pointer hover:ring-1 hover:ring-primary",
                  getDayClass(day),
                  isCurrentDay && "ring-2 ring-primary ring-offset-2"
                )}
                title={dayObs?.map(ob => 
                  `${ob.form_name || ob.subtag}: ${ob.status}`
                ).join('\n')}
              >
                <span className="text-sm">{format(day, "d")}</span>
                {dayObs?.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayObs.slice(0, 3).map((ob, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          ob.status === "filed" ? "bg-success" :
                          ob.status === "overdue" || getDaysUntilDue(ob.due_date) < 0 ? "bg-destructive" :
                          getDaysUntilDue(ob.due_date) <= 3 ? "bg-warning" :
                          "bg-primary"
                        )}
                      />
                    ))}
                    {dayObs.length > 3 && (
                      <span className="text-[8px] font-medium ml-0.5">
                        +{dayObs.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Due</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span>Filed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span>Urgent (≤3d)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span>Overdue</span>
          </div>
        </div>

        {/* Monthly Filings List */}
        <div className="space-y-3 mt-6">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            This Month's Filings ({monthObligations.length})
          </h4>

          {monthObligations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No filings due this month</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {monthObligations.map((ob) => {
                const daysUntil = getDaysUntilDue(ob.due_date);
                const { severity } = getCompliancePriority(ob.due_date);
                const isFiled = ob.status === "filed";

                return (
                  <div
                    key={ob._id}
                    className={cn(
                      "p-3 border rounded-lg flex items-center justify-between",
                      !isFiled &&
                        severity === "critical" &&
                        "border-l-4 border-l-destructive bg-destructive/5",
                      !isFiled &&
                        severity === "warning" &&
                        "border-l-4 border-l-warning bg-warning/5",
                      isFiled && "opacity-70 bg-success/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {ob.form_name || ob.subtag}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ob.form_description || ob.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {getStatusBadge(ob.status)}
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          {format(parseISO(ob.due_date), "dd MMM")}
                        </p>
                        {!isFiled && (
                          <p
                            className={cn(
                              "text-[10px]",
                              daysUntil < 0
                                ? "text-destructive font-medium"
                                : daysUntil <= 3
                                ? "text-warning font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {daysUntil < 0
                              ? `${Math.abs(daysUntil)}d overdue`
                              : daysUntil === 0
                              ? "Due today"
                              : `${daysUntil}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}