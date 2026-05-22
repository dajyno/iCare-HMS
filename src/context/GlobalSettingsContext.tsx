import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { GlobalSettings } from "@/src/types/globalSettings";
import { getDefaultSettings } from "@/src/lib/globalSettings";
import { fetchSettings, upsertSettings } from "@/src/services/globalSettingsService";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "icare_global_settings";

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  resetSettings: () => void;
  loading: boolean;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

function loadLocalCache(): GlobalSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GlobalSettings;
  } catch {
    return null;
  }
}

function saveLocalCache(settings: GlobalSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const db = await fetchSettings(supabase);
      if (cancelled) return;

      if (db) {
        const merged = { ...getDefaultSettings(), ...db };
        setSettings(merged);
        saveLocalCache(merged);
        setLoading(false);
        return;
      }

      const local = loadLocalCache();
      if (local) {
        setSettings(local);
        setLoading(false);
        return;
      }

      setSettings(getDefaultSettings());
      setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveLocalCache(next);
      upsertSettings(supabase, next, user?.id);
      return next;
    });
  }, [user?.id]);

  const resetSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    saveLocalCache(defaults);
    upsertSettings(supabase, defaults, user?.id);
  }, [user?.id]);

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
