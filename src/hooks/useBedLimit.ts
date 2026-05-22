import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTenant } from "../context/TenantContext";

interface BedLimitResult {
  withinLimit: boolean;
  used: number;
  total: number;
  loading: boolean;
}

export function useBedLimit(): BedLimitResult {
  const { tenant } = useTenant();
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function countBeds() {
      const { count, error } = await supabase
        .from("beds")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.tenantId);

      if (!cancelled) {
        setUsed(error ? 0 : (count ?? 0));
        setLoading(false);
      }
    }

    countBeds();
    return () => { cancelled = true; };
  }, [tenant]);

  const total = tenant?.maxBedCapacity ?? 0;
  const withinLimit = total > 0 && used < total;

  return { withinLimit, used, total, loading };
}

export function useCheckBedLimit() {
  const { tenant } = useTenant();

  return async function checkBedLimit(): Promise<{ allowed: boolean; used: number; total: number }> {
    if (!tenant) return { allowed: false, used: 0, total: 0 };

    const { count, error } = await supabase
      .from("beds")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.tenantId);

    const used = error ? 0 : (count ?? 0);
    const total = tenant.maxBedCapacity;
    return { allowed: total > 0 && used < total, used, total };
  };
}
