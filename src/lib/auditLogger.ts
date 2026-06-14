import { supabase } from "./supabase";
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
    if (!userId) return;

    await adminSupabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      details: details || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to log audit event:", e);
  }
}
