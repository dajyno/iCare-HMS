import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase, toCamel } from "../lib/supabase";
import { getEffectiveAllowedModules } from "../lib/moduleAccess";
import type { Tenant } from "../types/tenant";

interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  effectiveAllowedModules: string[];
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const effectiveAllowedModules = getEffectiveAllowedModules(tenant);

  const refreshTenant = useCallback(async () => {
    if (!tenant) return;
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("tenant_id", tenant.tenantId)
      .maybeSingle();
    if (!error && data) {
      setTenant(toCamel(data) as Tenant);
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, setTenant, effectiveAllowedModules, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
};
