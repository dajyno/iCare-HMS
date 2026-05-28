import type { GlobalSettings } from "@/src/types/globalSettings";

export async function fetchSettings(supabase: any): Promise<GlobalSettings | null> {
  const { data, error } = await supabase
    .from("global_settings")
    .select("settings")
    .eq("id", 1)
    .single();

  if (error || !data) return null;
  return data.settings as GlobalSettings;
}

export async function upsertSettings(
  supabase: any,
  settings: GlobalSettings,
  userId?: string,
): Promise<boolean> {
  const { error } = await supabase.from("global_settings").upsert(
    {
      id: 1,
      settings,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    },
    { onConflict: "tenant_id,id" },
  );

  if (error) {
    console.error("Failed to upsert global_settings:", error);
    return false;
  }
  return true;
}
