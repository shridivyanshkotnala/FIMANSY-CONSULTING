import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";

// ❌ removed supabase
// import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import {
  format,
  addDays,
  isSameDay,
  isAfter,
  isBefore,
  setDate
} from "date-fns";

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ComplianceCalendar
 *
 * ROLE:
 * Pure statutory rule engine + visual tracker.
 *
 * DOES:
 * - generates Indian compliance deadlines
 * - visualizes readiness
 *
 * DOES NOT:
 * - fetch accounting data
 *
 * Redux later provides:
 * complianceReadiness = {
 *   gstReadiness: number
 *   tdsReadiness: number
 *   advanceTaxReadiness: number
 * }
 */

function generateDeadlines(date) {
  const month = date.getMonth();
  const year = date.getFullYear();

  const deadlines = [
    {
      id: `gstr1-${month}-${year}`,
      name: "GSTR-1",
      dueDate: setDate(date, 11),
      type: "gst",
      status: "pending",
      readiness: 0,
      description: "Outward supplies return",
    },
    {
      id: `tds-${month}-${year}`,
      name: "TDS Payment",
      dueDate: setDate(date, 7),
      type: "tds",
      status: "pending",
      readiness: 0,
      description: "Monthly TDS deposit",
    },
    {
      id: `gstr3b-${month}-${year}`,
      name: "GSTR-3B",
      dueDate: setDate(date, 20),
      type: "gst",
      status: "pending",
      readiness: 0,
      description: "Summary return with tax payment",
    },
  ];

  // Advance tax quarters
  const advanceTaxDates = [
    { month: 5, day: 15, label: "Q1 Advance Tax" },
    { month: 8, day: 15, label: "Q2 Advance Tax" },
    { month: 11, day: 15, label: "Q3 Advance Tax" },
    { month: 2, day: 15, label: "Q4 Advance Tax" },
  ];

  advanceTaxDates.forEach((at) => {
    if (month === at.month) {
      deadlines.push({
        id: `advtax-${at.month}-${year}`,
        name: at.label,
        dueDate: setDate(date, at.day),
        type: "advance_tax",
        status: "pending",
        readiness: 0,
        description: "Quarterly advance tax installment",
      });
    }
  });

  return deadlines.sort((a, b) => a.dueDate - b.dueDate);
}

export function ComplianceCalendar() {
  const { organization } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deadlines, setDeadlines] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    if (!organization?.id) return;

    const monthDeadlines = generateDeadlines(selectedDate);

    /**
     * 🔴 REDUX INTEGRATION POINT
     *
     * Replace mock with:
     * const readiness = useSelector(selectComplianceReadiness)
     */
    const readiness = {
      gstReadiness: 65,
      tdsReadiness: 40,
      advanceTaxReadiness: 50,
    };

    // Apply readiness logic (BUSINESS RULES PRESERVED)
    monthDeadlines.forEach((deadline) => {
      if (deadline.type === "gst") {
        deadline.readiness = readiness.gstReadiness;
      } else if (deadline.type === "tds") {
        deadline.readiness = readiness.tdsReadiness;
      } else {
        deadline.readiness = readiness.advanceTaxReadiness;
      }

      deadline.status = deadline.readiness >= 90 ? "data_ready" : "pending";

      if (isBefore(deadline.dueDate, new Date())) {
        deadline.status = "filed";
        deadline.readiness = 100;
      }
    });

    setDeadlines(monthDeadlines);

    // upcoming 7 days
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const upcoming = monthDeadlines.filter(
      (d) => isAfter(d.dueDate, today) && isBefore(d.dueDate, nextWeek)
    );

    setUpcomingDeadlines(upcoming);
  }, [organization?.id, selectedDate]);

  const getTypeIcon = (type) => {
    switch (type) {
      case "gst":
        return <FileText className="h-4 w-4" />;
      case "tds":
      case "advance_tax":
        return <IndianRupee className="h-4 w-4" />;
      default:
        return <CalendarClock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "filed":
        return <Badge className="bg-success/10 text-success">Filed</Badge>;
      case "data_ready":
        return <Badge className="bg-info/10 text-info">Data Ready</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  const getReadinessColor = (readiness) => {
    if (readiness >= 90) return "bg-success";
    if (readiness >= 60) return "bg-warning";
    return "bg-destructive";
  };

  const deadlineDates = deadlines.map((d) => d.dueDate);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            Compliance Calendar
          </CardTitle>
          <CardDescription>
            Indian statutory deadlines auto-populated
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{ deadline: deadlineDates }}
            />

            <div className="flex-1 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {format(selectedDate, "MMMM yyyy")} Deadlines
              </h4>

              {deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    isSameDay(deadline.dueDate, selectedDate) && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(deadline.type)}
                      <span className="font-medium">{deadline.name}</span>
                    </div>
                    {getStatusBadge(deadline.status)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Data Readiness</span>
                      <span>{deadline.readiness}%</span>
                    </div>

                    <Progress
                      value={deadline.readiness}
                      className="h-1.5"
                      indicatorClassName={getReadinessColor(deadline.readiness)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Upcoming (7 Days)
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success opacity-50" />
              <p className="text-sm">No deadlines in next 7 days</p>
            </div>
          ) : (
            upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(deadline.type)}
                  <span className="font-semibold">{deadline.name}</span>
                </div>

                <span className="text-sm font-medium">
                  {format(deadline.dueDate, "dd MMM yyyy")}
                </span>

                <Progress
                  value={deadline.readiness}
                  className="h-1.5 mt-2"
                  indicatorClassName={getReadinessColor(deadline.readiness)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
