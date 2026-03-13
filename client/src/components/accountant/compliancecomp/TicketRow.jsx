import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, MessageCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { STATUS_CONFIG } from "./constants";

export function TicketRow({ ticket, today, onSelect, showOrg = false }) {
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.not_started;

  const daysLeft = differenceInDays(new Date(ticket.due_date), today);

  const isOverdue = ticket.status === "overdue";

  return (
    <div
      className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
        isOverdue
          ? "border-destructive/30 bg-destructive/5"
          : "bg-card"
      }`}
      onClick={onSelect}
    >

      <div className="flex items-center justify-between gap-4">

        {/* Left */}
        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">
              {ticket.form_name}
            </p>

            {ticket.ticket_number && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {ticket.ticket_number}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate">
            {ticket.form_description}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">

            {showOrg && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <Building2 className="h-2.5 w-2.5" />
                {ticket.organization_name}
              </Badge>
            )}

            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              {ticket.primary_tag}
            </Badge>

            {ticket.has_client_update && (
              <Badge className="bg-info/10 text-info border-info/20 text-[10px] px-1.5 py-0 gap-0.5 animate-pulse">
                <MessageCircle className="h-2.5 w-2.5" />
                Client Update
              </Badge>
            )}

            {ticket.financial_year && (
              <span className="text-[10px] text-muted-foreground">
                FY {ticket.financial_year}
              </span>
            )}

          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">

          <div className="text-right">
            <Badge className={`${cfg.className} text-[10px]`}>
              {cfg.label}
            </Badge>

            <p
              className={`text-[10px] mt-1 font-medium ${
                isOverdue
                  ? "text-destructive"
                  : daysLeft <= 3
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}
            >
              {isOverdue
                ? `${Math.abs(daysLeft)}d overdue`
                : `${daysLeft}d left`}
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Due</p>
            <p className="text-xs font-medium">
              {format(new Date(ticket.due_date), "dd MMM")}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground" />

        </div>
      </div>
    </div>
  );
}
