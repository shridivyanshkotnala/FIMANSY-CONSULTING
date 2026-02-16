import { useState } from "react";
import { cn } from "@/lib/utils";

/*
========================================================
MobileTimePeriodSwipe

Purpose:
Controls analytics time range (today / week / month / etc)

Right now:
→ Local state

Later (IMPORTANT):
This should move to GLOBAL STATE (Redux slice: analyticsPeriod)

Why?
All dashboards must react to the same period:
 - Cash Flow
 - Command Center
 - Insights
 - Reports

Otherwise every component calculates differently → inconsistent numbers.
========================================================
*/

export function MobileTimePeriodSwipe({
  periods,
  defaultPeriod,
  onPeriodChange,
  children,
}) {
  const [activePeriod, setActivePeriod] = useState(
    defaultPeriod || periods[0]?.key
  );

  const handlePeriodChange = (period) => {
    setActivePeriod(period);

    /*
    FUTURE REDUX FLOW:

    dispatch(setAnalyticsPeriod(period))

    NOT local only — global analytics time context
    */

    onPeriodChange(period);
  };

  return (
    <div className="space-y-4">
      
      {/* PERIOD SELECTOR */}
      <div className="flex items-center justify-center gap-1 p-1 bg-muted/50 rounded-xl">
        {periods.map((period) => (
          <button
            key={period.key}
            onClick={() => handlePeriodChange(period.key)}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all touch-manipulation",
              activePeriod === period.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* CONTENT RENDER */}
      <div className="animate-fade-in">
        {children(activePeriod)}
      </div>
    </div>
  );
}
