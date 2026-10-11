// Parent must approve the separate adaptation commit, then replace this sentinel
// in a subsequent approval-only commit. Never infer approval from HEAD or bytes.
export const v2AuditHead = 'PENDING_PARENT_V2_AUDIT_APPROVAL';
