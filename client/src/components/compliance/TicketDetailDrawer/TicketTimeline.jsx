import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { STATUS_PIPELINE, STATUS_LABELS, STATUS_CONFIG, STATUS_TRANSITIONS } from "./constants";

export function TicketTimeline({ currentTicket, statusHistory, updatingStatus, onStatusUpdate, canUpdateStatus = false }) {
  const isOverdue = currentTicket.status === "overdue";
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Status Display */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <Badge
              className={cn(
                isOverdue && "bg-destructive/10 text-destructive border-destructive/20",
                (currentTicket.status === "filed" || currentTicket.status === "approved") &&
                "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400"
              )}
            >
              {STATUS_LABELS[currentTicket.status] || currentTicket.status}
            </Badge>
          </div>

          {/* Move to buttons */}
          {canUpdateStatus && STATUS_TRANSITIONS[currentTicket.status]?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Move to:</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_TRANSITIONS[currentTicket.status].map((nextStatus) => {
                  const nextCfg = STATUS_CONFIG[nextStatus];
                  return (
                    <Button
                      key={nextStatus}
                      variant="outline"
                      size="sm"
                      disabled={updatingStatus}
                      onClick={() => onStatusUpdate(nextStatus)}
                      className="gap-1.5"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {updatingStatus ? `${nextCfg?.label}...` : nextCfg?.label || nextStatus}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {(!canUpdateStatus ||
            !STATUS_TRANSITIONS[currentTicket.status] ||
            STATUS_TRANSITIONS[currentTicket.status].length === 0) && (
              <p className="text-xs text-muted-foreground">
                {currentTicket.status === "closed"
                  ? "Ticket is closed and archived."
                  : canUpdateStatus
                    ? "No further transitions available."
                    : "Status updates are managed by accountant."}
              </p>
            )}

          <Separator />

          {/* Timeline - Show all statuses with dates */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Timeline</p>

            {(() => {
              const PIPELINE = ["initiated", "pending_docs", "in_progress", "filed", "approved", "closed"];

              // Create a map of status history entries
              const historyMap = {};
              statusHistory.forEach(entry => {
                if (entry && entry.status) {
                  historyMap[entry.status] = entry;
                }
              });

              // 🎯 FIX 7: Only create default entry if we have NO history at all
              if (Object.keys(historyMap).length === 0 && currentTicket.createdAt) {
                historyMap.initiated = {
                  status: "initiated",
                  changed_by_role: "admin",
                  at: currentTicket.createdAt,
                  note: "Ticket created"
                };
              }

              return PIPELINE.map((status) => {
                const historyEntry = historyMap[status];
                const isCurrentStatus = status === currentTicket.status;
                const isPastStatus = PIPELINE.indexOf(currentTicket.status) > PIPELINE.indexOf(status);

                let displayDate = "—";
                let changedBy = "";

                if (historyEntry?.at) {
                  try {
                    const date = new Date(historyEntry.at);
                    if (isValid(date)) {
                      displayDate = format(date, "dd MMM, HH:mm");
                      changedBy = historyEntry.changed_by_role === 'admin' ? 'Accountant' : 'Client';
                    }
                  } catch (error) {
                    console.warn("Error formatting date:", error);
                  }
                }

                return (
                  <div key={status} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 h-2 w-2 rounded-full shrink-0",
                      isCurrentStatus
                        ? "bg-primary"
                        : isPastStatus || historyEntry
                          ? "bg-green-500"
                          : "bg-gray-300 dark:bg-gray-600"
                    )} />
                    <div>
                      <p className="text-xs font-medium">
                        {STATUS_LABELS[status] || status}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {displayDate !== "—" ? `${displayDate} · ${changedBy}` : displayDate}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}