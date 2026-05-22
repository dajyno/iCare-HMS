import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { GlobalSettings } from "@/src/types/globalSettings";
import { loadSettings, saveSettings, getDefaultSettings, resetSettings as resetPersisted } from "@/src/lib/globalSettings";

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  resetSettings: () => void;
  loading: boolean;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSettings(loadSettings());
    setLoading(false);
  }, []);

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    resetPersisted();
    setSettings(getDefaultSettings());
  }, []);

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
