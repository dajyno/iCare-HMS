import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { GlobalSettings } from "@/src/types/globalSettings";
import { getDefaultSettings } from "@/src/lib/globalSettings";
import { fetchSettings, upsertSettings } from "@/src/services/globalSettingsService";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "./AuthContext";
import { useTenant } from "./TenantContext";

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  resetSettings: () => void;
  loading: boolean;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

function localKey(tenantId?: string | null): string {
  return `icare_global_settings_${tenantId || "default"}`;
}

function loadLocalCache(tenantId?: string | null): GlobalSettings | null {
  try {
    const raw = localStorage.getItem(localKey(tenantId));
    if (!raw) return null;
    return JSON.parse(raw) as GlobalSettings;
  } catch {
    return null;
  }
}

function saveLocalCache(settings: GlobalSettings, tenantId?: string | null): void {
  try {
    localStorage.setItem(localKey(tenantId), JSON.stringify(settings));
  } catch { /* ignore */ }
}

/** Reads hospital_name from the tenants table (canonical source). */
async function fetchTenantHospitalName(tenantId: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from("tenants")
    .select("hospital_name")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!data) return null;
  return data.hospital_name ?? null;
}

/** Merges global_settings DB data with the canonical hospital_name from tenants table. */
async function buildSettings(tenantId: string): Promise<GlobalSettings> {
  const [db, hospitalName] = await Promise.all([
    fetchSettings(supabase, tenantId),
    fetchTenantHospitalName(tenantId),
  ]);
  const defaults = getDefaultSettings();
  const merged = { ...defaults, ...(db || {}) };
  merged.rbacMatrix = { ...defaults.rbacMatrix, ...(db?.rbacMatrix || {}) };
  if (hospitalName) merged.hospitalName = hospitalName;
  return merged;
}

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const effectiveTenantId = user?.tenantId || tenant?.tenantId;
  const [settings, setSettings] = useState<GlobalSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const pendingUpsert = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function init() {
      if (!effectiveTenantId) {
        setSettings(getDefaultSettings());
        setLoading(false);
        return;
      }

      const cached = loadLocalCache(effectiveTenantId);
      if (cached) {
        setSettings(cached);
      }
      setLoading(!cached);

      const merged = await buildSettings(effectiveTenantId);
      if (cancelled) return;
      setSettings(merged);
      saveLocalCache(merged, effectiveTenantId);
      setLoading(false);
    }

    init();

    // Poll for changes (e.g., hospital name edited by admin)
    intervalId = setInterval(async () => {
      if (cancelled || !effectiveTenantId) return;
      const merged = await buildSettings(effectiveTenantId);
      if (cancelled) return;
      setSettings(merged);
      saveLocalCache(merged, effectiveTenantId);
    }, 30000);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [user?.tenantId, user?.id, tenant?.tenantId]);

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings((prev) => {
      const next = partial.rbacMatrix
        ? { ...prev, ...partial, rbacMatrix: { ...prev.rbacMatrix, ...partial.rbacMatrix } }
        : { ...prev, ...partial };
      saveLocalCache(next, effectiveTenantId);
      pendingUpsert.current = pendingUpsert.current.then(() =>
        upsertSettings(supabase, next, user?.id, effectiveTenantId)
      );
      return next;
    });
  }, [effectiveTenantId]);

  const resetSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    saveLocalCache(defaults, effectiveTenantId);
    pendingUpsert.current = pendingUpsert.current.then(() =>
      upsertSettings(supabase, defaults, user?.id, effectiveTenantId)
    );
  }, [effectiveTenantId]);

  return (
    <GlobalSettingsContext.Provider value={{ settings, updateSettings, resetSettings, loading }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (!context) throw new Error("useGlobalSettings must be used within GlobalSettingsProvider");
  return context;
}
