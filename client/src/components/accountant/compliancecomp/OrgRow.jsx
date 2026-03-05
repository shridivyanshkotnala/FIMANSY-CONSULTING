import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, ChevronRight } from "lucide-react";
import { HEALTH_COLORS } from "./constants";

export function OrgRow({ org, onClick }) {
  const hc = HEALTH_COLORS[org.health_status];

  return (
    <div
      className="p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-primary/30 bg-card"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">

        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-semibold text-sm truncate">
              {org.organization_name}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{org.company_name}</span>
            {org.cin && (
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {org.cin}
              </span>
            )}
          </div>
        </div>

        {/* Middle - Health & Stats */}
        <div className="hidden md:flex items-center gap-4">

          <div className="text-center">
            <Badge className={`${hc.bg} ${hc.text} border-0 text-[10px]`}>
              {hc.label}
            </Badge>

            <div className="mt-1">
              <Progress
                value={org.health_score}
                className="h-1.5 w-16"
                indicatorClassName={
                  org.health_status === "healthy"
                    ? "bg-success"
                    : org.health_status === "attention"
                    ? "bg-warning"
                    : "bg-destructive"
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">

            <div>
              <p className="text-sm font-bold text-foreground">
                {org.total_active}
              </p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>

            <div>
              <p
                className={`text-sm font-bold ${
                  org.overdue_count > 0
                    ? "text-destructive"
                    : "text-foreground"
                }`}
              >
                {org.overdue_count}
              </p>
              <p className="text-[10px] text-muted-foreground">Overdue</p>
            </div>

            <div>
              <p
                className={`text-sm font-bold ${
                  org.upcoming_7d > 0
                    ? "text-warning"
                    : "text-foreground"
                }`}
              >
                {org.upcoming_7d}
              </p>
              <p className="text-[10px] text-muted-foreground">Due 7d</p>
            </div>

            <div>
              <p
                className={`text-sm font-bold ${
                  org.pending_docs_count > 0
                    ? "text-warning"
                    : "text-foreground"
                }`}
              >
                {org.pending_docs_count}
              </p>
              <p className="text-[10px] text-muted-foreground">Docs</p>
            </div>

          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex md:hidden items-center gap-2">

          <Badge className={`${hc.bg} ${hc.text} border-0 text-[10px]`}>
            {hc.label}
          </Badge>

          {org.overdue_count > 0 && (
            <Badge
              variant="outline"
              className="text-destructive border-destructive/20 text-[10px]"
            >
              {org.overdue_count} overdue
            </Badge>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

      </div>
    </div>
  );
}
