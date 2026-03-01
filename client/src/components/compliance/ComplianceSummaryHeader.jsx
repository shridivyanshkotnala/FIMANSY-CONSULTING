import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, Users } from "lucide-react";

import { getCurrentFinancialYear } from "@/lib/compliance/utils";

/*
  ==========================================================
  Compliance Summary Header
  ----------------------------------------------------------
  Props:
  - profile (object or null)
  - directors (array)
  ==========================================================
*/

export function ComplianceSummaryHeader({ profile, directors }) {

  const fy = getCurrentFinancialYear();

  // Count active directors
  const activeDirectors = directors.filter(
    (d) => d.is_active
  ).length;

  /*
    ==========================================================
    Get Current Quarter (Indian FY)
    ==========================================================
  */
  const getCurrentQuarter = () => {
    const month = new Date().getMonth();

    if (month >= 3 && month <= 5)
      return "Q1 (Apr–Jun)";

    if (month >= 6 && month <= 8)
      return "Q2 (Jul–Sep)";

    if (month >= 9 && month <= 11)
      return "Q3 (Oct–Dec)";

    return "Q4 (Jan–Mar)";
  };

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
              <p className="text-xs text-muted-foreground">
                Company Type
              </p>

              <p className="font-semibold capitalize text-sm">
                {profile?.company_type?.replace(/_/g, " ") ||
                  "Not Set"}
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
              <p className="text-xs text-muted-foreground">
                Financial Year
              </p>

              <p className="font-semibold text-sm">
                FY {fy} · {getCurrentQuarter()}
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
              <p className="text-xs text-muted-foreground">
                Directors
              </p>

              <p className="font-semibold text-sm">
                {activeDirectors}
              </p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}