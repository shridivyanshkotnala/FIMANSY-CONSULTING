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

// ⚠️ CONTEXT API — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux RTK Query selectors
// const obligations = useSelector(state => state.compliance.obligations)
// const loading = useSelector(state => state.compliance.loading)
import { useCompliance } from "@/hooks/useCompliance";

// Utility Functions (Business Logic — DO NOT REMOVE)
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
  addMonths,
} from "date-fns";

// Icons
import {
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// Classname utility
import { cn } from "@/lib/utils";

/*
  ==========================================================
  Compliance Calendar Component
  ----------------------------------------------------------
  Handles:
  - Month navigation
  - Calendar grid rendering
  - Obligation grouping
  - Severity visualization
  - Upcoming filings list
  ==========================================================
*/

export function ComplianceCalendar() {

  // ⚠️ Context Source
  const { obligations, loading } = useCompliance();

  // Local month state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate month boundaries
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // All days in current month
  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  /*
    ==========================================================
    Filter obligations for visible month
    ==========================================================
  */
  const monthObligations = useMemo(() => {
    return obligations.filter((ob) => {
      const dueDate = new Date(ob.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }, [obligations, monthStart, monthEnd]);

  /*
    ==========================================================
    Group obligations by due_date
    TS: Record<string, typeof obligations>
    JS: Plain Object
    ==========================================================
  */
  const obligationsByDate = useMemo(() => {
    const grouped = {}; // removed TS typing

    monthObligations.forEach((ob) => {
      const dateKey = ob.due_date;

      if (!grouped[dateKey]) grouped[dateKey] = [];

      grouped[dateKey].push(ob);
    });

    return grouped;
  }, [monthObligations]);

  /*
    ==========================================================
    Status Badge Renderer
    TS removed: (status: string)
    ==========================================================
  */
  const getStatusBadge = (status) => {
    switch (status) {
      case "filed":
        return (
          <Badge className="bg-success/10 text-success border-success text-xs">
            Filed
          </Badge>
        );

      case "in_progress":
        return (
          <Badge className="bg-info/10 text-info border-info text-xs">
            In Progress
          </Badge>
        );

      case "overdue":
        return (
          <Badge variant="destructive" className="text-xs">
            Overdue
          </Badge>
        );

      default:
        return (
          <Badge variant="outline" className="text-xs">
            Pending
          </Badge>
        );
    }
  };

  /*
    ==========================================================
    Day Cell Styling Logic
    TS removed: (date: Date)
    ==========================================================
  */
  const getDayClass = (date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayObligations = obligationsByDate[dateKey];

    if (!dayObligations?.length) return "";

    const hasOverdue = dayObligations.some(
      (ob) =>
        ob.status === "overdue" ||
        getDaysUntilDue(ob.due_date) < 0
    );

    const hasUrgent = dayObligations.some(
      (ob) =>
        getDaysUntilDue(ob.due_date) <= 7 &&
        ob.status !== "filed"
    );

    const allFiled = dayObligations.every(
      (ob) => ob.status === "filed"
    );

    if (hasOverdue)
      return "bg-destructive/20 text-destructive font-bold";

    if (allFiled)
      return "bg-success/20 text-success";

    if (hasUrgent)
      return "bg-warning/20 text-warning font-bold";

    return "bg-primary/20 text-primary";
  };

  /*
    ==========================================================
    LOADING STATE
    ==========================================================
  */
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

  /*
    ==========================================================
    MAIN RENDER
    ==========================================================
  */
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">

          {/* Title Section */}
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance Calendar
            </CardTitle>
            <CardDescription>
              Track all statutory filing deadlines
            </CardDescription>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth(addMonths(currentMonth, -1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth(addMonths(currentMonth, 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ================= CALENDAR GRID ================= */}
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
            const dateKey = format(day, "yyyy-MM-dd");
            const dayObligations = obligationsByDate[dateKey];
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateKey}
                className={cn(
                  "h-12 flex flex-col items-center justify-center rounded-lg transition-colors relative",
                  getDayClass(day),
                  isToday && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <span className="text-sm">
                  {format(day, "d")}
                </span>

                {dayObligations?.length ? (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayObligations
                      .slice(0, 3)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="h-1 w-1 rounded-full bg-current"
                        />
                      ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* ================= UPCOMING FILINGS ================= */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            This Month's Filings
          </h4>

          {monthObligations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No filings due this month
              </p>
            </div>
          ) : (
            monthObligations.map((ob) => {
              const daysUntil = getDaysUntilDue(ob.due_date);
              const { severity } =
                getCompliancePriority(ob.due_date);

              return (
                <div
                  key={ob.id}
                  className={cn(
                    "p-4 border rounded-lg flex items-center justify-between",
                    severity === "critical" &&
                      "border-l-4 border-l-destructive bg-destructive/5",
                    severity === "warning" &&
                      "border-l-4 border-l-warning bg-warning/5"
                  )}
                >
                  <div className="flex items-center gap-3">

                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        severity === "critical" &&
                          "bg-destructive/10 text-destructive",
                        severity === "warning" &&
                          "bg-warning/10 text-warning",
                        severity === "info" &&
                          "bg-info/10 text-info"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="font-medium">
                        {ob.form_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ob.form_description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(ob.status)}

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(ob.due_date), "dd MMM")}
                      </p>

                      <p
                        className={cn(
                          "text-xs",
                          daysUntil < 0
                            ? "text-destructive"
                            : daysUntil <= 7
                            ? "text-warning"
                            : "text-muted-foreground"
                        )}
                      >
                        {daysUntil < 0
                          ? `${Math.abs(daysUntil)}d overdue`
                          : daysUntil === 0
                          ? "Due today"
                          : `${daysUntil}d left`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}