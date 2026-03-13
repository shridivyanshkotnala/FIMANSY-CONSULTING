export const STATUS_CONFIG = {
  initiated: { label: "Initiated", className: "bg-primary/10 text-primary border-primary/20" },
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border-border" },
  pending_docs: { label: "Pending Docs", className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "In Progress", className: "bg-info/10 text-info border-info/20" },
  filed: { label: "Filed", className: "bg-success/10 text-success border-success/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

export const ONGOING_STATUSES = ["initiated", "pending_docs", "in_progress", "filed", "approved", "overdue", "not_started"];
export const CLOSED_STATUSES = ["closed"];
export const CATEGORY_TAGS = ["GST", "TDS", "Income Tax", "MCA", "Payroll", "Other"];

export const HEALTH_COLORS = {
  healthy: { bg: "bg-success/10", text: "text-success", label: "Healthy" },
  attention: { bg: "bg-warning/10", text: "text-warning", label: "Attention" },
  critical: { bg: "bg-destructive/10", text: "text-destructive", label: "Critical" },
};
