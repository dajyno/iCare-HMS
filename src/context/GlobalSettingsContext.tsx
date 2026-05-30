import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { GlobalSettings } from "@/src/types/globalSettings";
import { getDefaultSettings } from "@/src/lib/globalSettings";
import { fetchSettings, upsertSettings } from "@/src/services/globalSettingsService";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "./AuthContext";

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

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function init() {
      if (!user?.tenantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = await fetchSettings(supabase, user?.tenantId);
      if (cancelled) return;

      if (db) {
        const merged = { ...getDefaultSettings(), ...db };
        setSettings(merged);
        saveLocalCache(merged, user.tenantId);
        setLoading(false);
        return;
      }

      // No settings found — use defaults locally (DB row created during provisioning)
      const defaults = getDefaultSettings();
      setSettings(defaults);
      saveLocalCache(defaults, user.tenantId);
      setLoading(false);
    }

    init();

    // Poll for changes (e.g., hospital name edited by admin)
    intervalId = setInterval(async () => {
      if (cancelled || !user?.tenantId) return;
      const db = await fetchSettings(supabase, user?.tenantId);
      if (cancelled || !db) return;
      const merged = { ...getDefaultSettings(), ...db };
      setSettings(merged);
      saveLocalCache(merged, user.tenantId);
    }, 30000);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [user?.tenantId, user?.id]);

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveLocalCache(next, user?.tenantId);
      upsertSettings(supabase, next, user?.id);
      return next;
    });
  }, [user?.id, user?.tenantId]);

  const resetSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    saveLocalCache(defaults, user?.tenantId);
    upsertSettings(supabase, defaults, user?.id);
  }, [user?.id, user?.tenantId]);

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
