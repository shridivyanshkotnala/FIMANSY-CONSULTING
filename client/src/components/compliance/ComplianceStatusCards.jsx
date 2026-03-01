import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";

import { getCurrentFinancialYear } from "@/lib/compliance/utils";

import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isBefore,
  startOfDay,
} from "date-fns";

/*
  ==========================================================
  Helper: Get Financial Year Range
  FY format expected: "2024-25"
  ==========================================================
*/
function getFYRange(fy) {
  const [startYear] = fy.split("-").map(Number);

  return {
    start: new Date(startYear, 3, 1),       // April 1
    end: new Date(startYear + 1, 2, 31),    // March 31
  };
}

/*
  ==========================================================
  Helper: Current Quarter (Indian FY based)
  Q1: Apr-Jun
  Q2: Jul-Sep
  Q3: Oct-Dec
  Q4: Jan-Mar
  ==========================================================
*/
function getCurrentQuarterRange() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (month >= 3 && month <= 5)
    return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };

  if (month >= 6 && month <= 8)
    return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };

  if (month >= 9 && month <= 11)
    return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };

  // Jan-Mar
  return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
}

/*
  ==========================================================
  Compliance Status Cards
  Props:
  - obligations (array)
  ==========================================================
*/

export function ComplianceStatusCards({ obligations }) {

  const today = startOfDay(new Date());
  const fy = getCurrentFinancialYear();

  /*
    ==========================================================
    Compute Counts
    ==========================================================
  */
  const counts = useMemo(() => {

    const monthRange = {
      start: startOfMonth(today),
      end: endOfMonth(today),
    };

    const quarterRange = getCurrentQuarterRange();
    const fyRange = getFYRange(fy);

    /*
      Pending = Not filed / not approved / not ignored / not not_applicable
    */
    const pending = obligations.filter(
      (ob) =>
        ob.status !== "filed" &&
        ob.status !== "approved" &&
        ob.status !== "ignored" &&
        ob.status !== "not_applicable"
    );

    /*
      Overdue = Due date passed + still not filed
    */
    const overdue = obligations.filter((ob) => {
      const due = new Date(ob.due_date);

      return (
        isBefore(due, today) &&
        ob.status !== "filed" &&
        ob.status !== "approved" &&
        ob.status !== "ignored" &&
        ob.status !== "not_applicable"
      );
    });

    const pendingThisMonth = pending.filter((ob) =>
      isWithinInterval(new Date(ob.due_date), monthRange)
    );

    const pendingThisQuarter = pending.filter((ob) =>
      isWithinInterval(new Date(ob.due_date), quarterRange)
    );

    const pendingThisFY = pending.filter((ob) =>
      isWithinInterval(new Date(ob.due_date), fyRange)
    );

    return {
      total: pending.length,
      thisMonth: pendingThisMonth.length,
      thisQuarter: pendingThisQuarter.length,
      thisFY: pendingThisFY.length,
      overdue: overdue.length,
    };

  }, [obligations, today, fy]);

  return (
    <div className="grid gap-4 md:grid-cols-2">

      {/* ================= Pending Card ================= */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-accent/30">
        <CardContent className="pt-6 pb-5 px-6">

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-warning/15 ring-1 ring-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Pending Compliances
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-background/60 backdrop-blur-sm p-3.5 ring-1 ring-border/50">

            <div className="text-center">
              <p className="text-2xl font-bold">
                {counts.thisMonth}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                This Month
              </p>
            </div>

            <div className="text-center border-x border-border/50">
              <p className="text-2xl font-bold">
                {counts.thisQuarter}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                This Quarter
              </p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">
                {counts.thisFY}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                This FY
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ================= Overdue Card ================= */}
      <Card
        className={`border-0 shadow-md ${
          counts.overdue > 0
            ? "bg-gradient-to-br from-destructive/5 to-destructive/15 ring-1 ring-destructive/20"
            : "bg-gradient-to-br from-card to-success/10"
        }`}
      >
        <CardContent className="pt-6 pb-5 px-6">

          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-2.5 rounded-xl ring-1 ${
                counts.overdue > 0
                  ? "bg-destructive/15 ring-destructive/20"
                  : "bg-success/15 ring-success/20"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  counts.overdue > 0
                    ? "text-destructive"
                    : "text-success"
                }`}
              />
            </div>

            <p className="text-sm font-medium text-muted-foreground">
              Overdue Compliances
            </p>
          </div>

          <div
            className={`rounded-xl p-4 ring-1 ${
              counts.overdue > 0
                ? "bg-destructive/5 ring-destructive/10"
                : "bg-success/5 ring-success/10"
            }`}
          >
            <div className="flex items-center justify-between">

              <div>
                <p
                  className={`text-3xl font-extrabold tracking-tight ${
                    counts.overdue > 0
                      ? "text-destructive"
                      : "text-success"
                  }`}
                >
                  {counts.overdue}
                </p>

                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  {counts.overdue > 0
                    ? "Past due date & not yet filed"
                    : "All compliances up to date"}
                </p>
              </div>

              {counts.overdue === 0 && (
                <div className="text-2xl">✓</div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}