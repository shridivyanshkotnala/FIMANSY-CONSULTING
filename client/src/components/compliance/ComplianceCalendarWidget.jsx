import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Data Source
import { useCompliance } from "@/hooks/useCompliance";
import { getDaysUntilDue } from "@/lib/compliance/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  parseISO,
} from "date-fns";

// Icons
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Helper to parse dates consistently
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
};

export function ComplianceCalendar() {
  const { obligations, loading } = useCompliance();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const obligationsArray = Array.isArray(obligations) ? obligations : [];

  // Stats
  const stats = useMemo(() => {
    const filed = obligations.filter((ob) => ob.status === "filed").length;
    const overdue = obligations.filter((ob) => {
      if (ob.status === "filed" || !ob.due_date) return false;
      const d = parseDate(ob.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d && d < today;
    }).length;
    
    return {
      total: obligationsArray.length,
      filed,
      overdue,
      pending: obligationsArray.length - filed - overdue,
    };
  }, [obligations]);

  // Group ALL obligations by date for the calendar grid
  const obligationsByDate = useMemo(() => {
    const grouped = {};
    
    obligations.forEach((ob) => {
      if (!ob.due_date) return;
      const date = parseDate(ob.due_date);
      if (!date) return;
      
      const key = format(date, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ob);
    });
    
    return grouped;
  }, [obligations]);

  const getDayClass = (date) => {
    const key = format(date, "yyyy-MM-dd");
    const dayObs = obligationsByDate[key];

    if (!dayObs?.length) return "";

    const hasOverdue = dayObs.some(
      (ob) => ob.status === "overdue" || getDaysUntilDue(ob.due_date) < 0
    );

    const hasUrgent = dayObs.some(
      (ob) =>
        getDaysUntilDue(ob.due_date) <= 3 &&
        ob.status !== "filed"
    );

    const allFiled = dayObs.every((ob) => ob.status === "filed");

    if (hasOverdue)
      return "bg-destructive/20 text-destructive font-semibold";

    if (hasUrgent)
      return "bg-warning/20 text-warning font-semibold";

    if (allFiled)
      return "bg-success/20 text-success";

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
            <CardDescription>
              {obligations.length} obligations loaded from backend
            </CardDescription>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            {/* Month navigation */}
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

        {/* Stats */}
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
        {/* Calendar */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            )
          )}

          {/* Empty cells before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayObs = obligationsByDate[key];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={cn(
                  "h-12 flex flex-col items-center justify-center rounded-lg transition-colors relative cursor-pointer hover:ring-1 hover:ring-primary",
                  getDayClass(day),
                  isToday && "ring-2 ring-primary ring-offset-2"
                )}
                title={dayObs?.map(ob => 
                  `${ob.form_name || ob.compliance_subtype}: ${ob.status}`
                ).join('\n')}
              >
                <span className="text-sm">{format(day, "d")}</span>

                {dayObs?.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayObs.slice(0, 3).map((ob, i) => {
                      // Determine dot color based on status
                      let dotColor = "bg-primary";
                      if (ob.status === "filed") dotColor = "bg-success";
                      else if (ob.status === "overdue" || getDaysUntilDue(ob.due_date) < 0) dotColor = "bg-destructive";
                      else if (getDaysUntilDue(ob.due_date) <= 3) dotColor = "bg-warning";
                      
                      return (
                        <div 
                          key={i} 
                          className={cn("h-1.5 w-1.5 rounded-full", dotColor)}
                        />
                      );
                    })}
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

        {/* Debug info - remove in production */}
        <div className="text-xs text-muted-foreground border-t pt-4 mt-2">
          <p>📊 Total obligations in DB: {obligations.length}</p>
          <p>📅 Dates with obligations: {Object.keys(obligationsByDate).length}</p>
          {obligations.length > 0 && (
            <p>🔍 Sample: {obligations[0].form_name || obligations[0].compliance_subtype} - {format(parseDate(obligations[0].due_date), "dd MMM yyyy")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}