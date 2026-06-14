import { supabase, getCurrentTenantId } from "./supabase";
import { adminSupabase } from "./adminSupabase";

export async function logAudit(
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, any>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("[auditLogger] No active session, skipping audit log");
      return;
    }

    const tenantId = getCurrentTenantId();

    await adminSupabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      details: details || null,
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[auditLogger] Failed to log audit event:", e);
  }
}
