import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTenant } from "../context/TenantContext";

interface SeatLimitResult {
  withinLimit: boolean;
  used: number;
  total: number;
  loading: boolean;
}

export function useSeatLimit(): SeatLimitResult {
  const { tenant } = useTenant();
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function countActiveUsers() {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.tenantId)
        .eq("status", "active");

      if (!cancelled) {
        setUsed(error ? 0 : (count ?? 0));
        setLoading(false);
      }
    }

    countActiveUsers();
    return () => { cancelled = true; };
  }, [tenant]);

  const total = tenant?.maxStaffSeats ?? 0;
  const withinLimit = used < total;

  return { withinLimit, used, total, loading };
}

export function useCheckSeatLimit() {
  const { tenant } = useTenant();

  return async function checkSeatLimit(): Promise<{ allowed: boolean; used: number; total: number }> {
    if (!tenant) return { allowed: false, used: 0, total: 0 };

    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.tenantId)
      .eq("status", "active");

    const used = error ? 0 : (count ?? 0);
    const total = tenant.maxStaffSeats;
    return { allowed: used < total, used, total };
  };
}
