import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, Users } from "lucide-react";

import { getCurrentFinancialYear, getCurrentQuarterLabel } from "@/lib/compliance/utils";

/*
  ==========================================================
  Compliance Summary Header
  ----------------------------------------------------------
  Props:
  - profile (object or null)
  - directors (array of all directors fetched for this profile)
  ==========================================================
*/

export function ComplianceSummaryHeader({ profile, directors, currentDate }) {
  const fy = getCurrentFinancialYear(currentDate);

  // Count active directors for this profile
  const activeDirectors = (directors || []).filter(
    (d) => d.is_active && d.profile_id === profile?._id
  ).length;

  const quarterLabel = getCurrentQuarterLabel(currentDate);

  return (
    <Card className="bg-card border">
      <CardContent className="py-4 px-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">

          {/* ================= Company Type ================= */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Company Type</p>
              <p className="font-semibold capitalize text-sm">
                {profile?.company_type?.replace(/_/g, " ") || "Not Set"}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden md:block" />

          {/* ================= Financial Year ================= */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Financial Year</p>
              <p className="font-semibold text-sm">
                FY {fy} · {quarterLabel}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden md:block" />

          {/* ================= Directors ================= */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Directors</p>
              <p className="font-semibold text-sm">{activeDirectors}</p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}