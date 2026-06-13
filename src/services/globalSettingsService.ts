import type { GlobalSettings } from "@/src/types/globalSettings";

export async function fetchSettings(supabase: any, tenantId?: string | null): Promise<GlobalSettings | null> {
  let query = supabase
    .from("global_settings")
    .select("settings")
    .eq("id", 1);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query.single();

  if (error || !data) return null;
  return data.settings as GlobalSettings;
}

export async function upsertSettings(
  supabase: any,
  settings: GlobalSettings,
  userId?: string,
  tenantId?: string | null,
): Promise<boolean> {
  const payload: Record<string, any> = {
    id: 1,
    settings,
    updated_at: new Date().toISOString(),
    updated_by: userId || null,
  };
  if (tenantId) payload.tenant_id = tenantId;

  const { error } = await supabase.from("global_settings").upsert(
    payload,
    { onConflict: "tenant_id,id" },
  );

  if (error) {
    console.error("Failed to upsert global_settings:", error);
    return false;
  }
  return true;
}
