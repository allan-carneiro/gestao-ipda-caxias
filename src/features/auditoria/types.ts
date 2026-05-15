export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "inactivate"
  | "mark_presence_control"
  | "unmark_presence_control"
  | "add_month_record"
  | "remove_month_record"
  | "finalize_month"
  | "clear_control_month"
  | "sync_control_from_sheets"
  | "sync_record_from_sheets";

export type AuditEntity =
  | "membro"
  | "ceia_controle"
  | "ceia_registro"
  | "ceia_mes"
  | "sistema";

export type WriteAuditLogInput = {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};