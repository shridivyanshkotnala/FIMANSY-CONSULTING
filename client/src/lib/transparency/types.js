/**
 * Work Management / Operations Module Contracts
 * ---------------------------------------------
 * Central reference for operational workflow entities:
 * WIP tasks, queries, audit logs, productivity tracking
 *
 * IMPORTANT:
 * Backend responses must match these shapes.
 * UI components should NOT invent new fields.
 */


/* ============================================================
   ENUM-LIKE VALUES (Former TS unions)
============================================================ */

export const WipStatuses = [
  'pending',
  'in_progress',
  'review',
  'completed',
  'blocked',
];

export const WipPriorities = [
  'low',
  'medium',
  'high',
  'urgent',
];

export const QueryStatuses = [
  'open',
  'awaiting_response',
  'resolved',
  'escalated',
];

export const AuditActions = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'upload',
  'download',
  'login',
  'export',
];


/* ============================================================
   SHAPE DOCUMENTATION (replaces interfaces)
============================================================ */

/**
WipItem
{
  id: string,
  organization_id: string,
  title: string,
  description: string | null,
  status: WipStatus,
  priority: WipPriority,
  category: string,
  assigned_to: string | null,
  created_by: string | null,
  due_date: string | null,
  estimated_hours: number | null,
  actual_hours: number | null,
  related_entity_type: string | null,
  related_entity_id: string | null,
  tags: string[] | null,
  notes: string | null,
  completed_at: string | null,
  created_at: string,
  updated_at: string
}
*/

/**
AuditLog
{
  id: string,
  organization_id: string,
  user_id: string | null,
  user_email: string | null,
  action: AuditAction,
  entity_type: string,
  entity_id: string | null,
  entity_name: string | null,
  changes: object | null,
  metadata: object | null,
  ip_address: string | null,
  user_agent: string | null,
  created_at: string
}
*/

/**
Query
{
  id: string,
  organization_id: string,
  query_number: string,
  subject: string,
  description: string,
  status: QueryStatus,
  priority: WipPriority,
  category: string | null,
  raised_by: string | null,
  assigned_to: string | null,
  related_entity_type: string | null,
  related_entity_id: string | null,
  due_date: string | null,
  resolved_at: string | null,
  resolved_by: string | null,
  resolution_notes: string | null,
  created_at: string,
  updated_at: string
}
*/

/**
QueryComment
{
  id: string,
  query_id: string,
  organization_id: string,
  user_id: string | null,
  content: string,
  attachments: any[] | null,
  is_internal: boolean,
  created_at: string
}
*/

/**
ProductivityMetric
{
  id: string,
  organization_id: string,
  user_id: string | null,
  metric_date: string,
  documents_processed: number,
  invoices_verified: number,
  bank_transactions_reconciled: number,
  queries_resolved: number,
  avg_query_resolution_hours: number | null,
  filings_completed: number,
  compliance_tasks_done: number,
  wip_items_completed: number,
  total_hours_logged: number,
  error_count: number,
  revision_count: number,
  productivity_score: number | null,
  created_at: string,
  updated_at: string
}
*/


/* ============================================================
   Category Options (Used by dropdowns / filters)
============================================================ */

export const WIP_CATEGORIES = [
  { value: 'gst_filing', label: 'GST Filing' },
  { value: 'bank_reconciliation', label: 'Bank Reconciliation' },
  { value: 'invoice_processing', label: 'Invoice Processing' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'audit', label: 'Audit' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
];

export const QUERY_CATEGORIES = [
  { value: 'clarification', label: 'Clarification Needed' },
  { value: 'missing_document', label: 'Missing Document' },
  { value: 'approval_needed', label: 'Approval Needed' },
  { value: 'discrepancy', label: 'Discrepancy Found' },
  { value: 'compliance_query', label: 'Compliance Query' },
  { value: 'general', label: 'General' },
];


/* ============================================================
   UI Status Color Mapping
   NOTE: purely presentation mapping — safe for components
============================================================ */

export const STATUS_COLORS = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/10 text-info',
  review: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  blocked: 'bg-destructive/10 text-destructive',
};

export const PRIORITY_COLORS = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export const QUERY_STATUS_COLORS = {
  open: 'bg-info/10 text-info',
  awaiting_response: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  escalated: 'bg-destructive/10 text-destructive',
};
