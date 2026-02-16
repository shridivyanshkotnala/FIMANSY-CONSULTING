import { 
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/*
  PulseTile
  Dashboard metric card (Cashflow, Banking, Inventory etc.)
  Shows value + status color + opens drilldown panel.

  Pure UI component — no API / global state
*/

export function PulseTile({
  title,
  icon: Icon,
  value,
  status,
  subtitle,
  actionLabel,
  onDrillDown
}) {
  const statusColors = {
    green: "border-primary/30 bg-primary/5 hover:bg-primary/10",
    amber: "border-warning/30 bg-warning/5 hover:bg-warning/10",
    red: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
  };

  const iconColors = {
    green: "text-primary bg-primary/10",
    amber: "text-warning bg-warning/10",
    red: "text-destructive bg-destructive/10",
  };

  const StatusIndicator = () => {
    if (status === "green") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (status === "amber") return <Clock className="h-4 w-4 text-warning" />;
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <button
      onClick={onDrillDown}
      className={cn(
        "w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group",
        statusColors[status]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconColors[status])}>
          <Icon className="h-5 w-5" />
        </div>
        <StatusIndicator />
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

/*
  DrillDownPanel
  Slide-over side panel opened from a PulseTile
  Used for quick details and navigation to full page
*/

export function DrillDownPanel({
  open,
  onClose,
  title,
  children,
  actionLabel,
  onAction
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {children}
        </div>

        {actionLabel && (
          <div className="mt-8 pt-4 border-t">
            <Button className="w-full" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
