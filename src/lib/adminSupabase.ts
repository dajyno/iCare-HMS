import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getCurrentTenantId } from "./supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set " +
    "in your .env file."
  );
}

const rawAdminSupabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Tables that should NOT receive automatic tenant filtering
const SKIP_TENANT_TABLES = new Set(["global_settings"]);

/** Wraps a query builder in a nested Proxy that auto-adds tenant_id filtering. */
function addTenantFilter(table: string, builder: any): any {
  const tenantId = getCurrentTenantId();
  if (!tenantId || SKIP_TENANT_TABLES.has(table)) return builder;

  return new Proxy(builder, {
    get(bTarget, bProp, bReceiver) {
      if (bProp === "select") {
        return (...args: any[]) => (bTarget as any).select(...args).eq("tenant_id", tenantId);
      }
      if (bProp === "update") {
        return (...args: any[]) => (bTarget as any).update(...args).eq("tenant_id", tenantId);
      }
      if (bProp === "delete") {
        return (...args: any[]) => (bTarget as any).delete(...args).eq("tenant_id", tenantId);
      }
      if (bProp === "insert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return (bTarget as any).insert(data.map((item: any) => ({ ...item, tenant_id: tenantId })), args[1]);
          }
          if (data && typeof data === "object") {
            return (bTarget as any).insert({ ...data, tenant_id: tenantId }, args[1]);
          }
          return (bTarget as any).insert(data, args[1]);
        };
      }
      if (bProp === "upsert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return (bTarget as any).upsert(data.map((item: any) => ({ ...item, tenant_id: tenantId })), args[1]);
          }
          if (data && typeof data === "object") {
            return (bTarget as any).upsert({ ...data, tenant_id: tenantId }, args[1]);
          }
          return (bTarget as any).upsert(data, args[1]);
        };
      }
      return Reflect.get(bTarget, bProp, bReceiver);
    },
  });
}

export const adminSupabase = new Proxy(rawAdminSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return (table: string) => addTenantFilter(table, target.from(table));
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof rawAdminSupabase;
