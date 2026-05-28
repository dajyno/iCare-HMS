import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set " +
    "in your .env file (or as build-time environment variables on your deployment platform)."
  );
}

const rawSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Tracks the current tenant ID for automatic tenant filtering via Proxy below.
let _currentTenantId: string | null = null;

export function setCurrentTenantId(id: string | null) {
  _currentTenantId = id;
}

/** Returns the current tenant ID, or null if no tenant context is active. */
export function getCurrentTenantId(): string | null {
  return _currentTenantId;
}

// Tables that should NOT receive automatic tenant filtering
const SKIP_TENANT_TABLES = new Set<string>();

/** Wraps a query builder in a nested Proxy that auto-adds tenant_id filtering. */
function addTenantFilter(table: string, builder: any): any {
  if (!_currentTenantId || SKIP_TENANT_TABLES.has(table)) return builder;

  return new Proxy(builder, {
    get(bTarget, bProp, bReceiver) {
      if (bProp === "select") {
        return (...args: any[]) => (bTarget as any).select(...args).eq("tenant_id", _currentTenantId);
      }
      if (bProp === "update") {
        return (...args: any[]) => (bTarget as any).update(...args).eq("tenant_id", _currentTenantId);
      }
      if (bProp === "delete") {
        return (...args: any[]) => (bTarget as any).delete(...args).eq("tenant_id", _currentTenantId);
      }
      if (bProp === "insert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return (bTarget as any).insert(data.map((item: any) => ({ ...item, tenant_id: _currentTenantId })), args[1]);
          }
          if (data && typeof data === "object") {
            return (bTarget as any).insert({ ...data, tenant_id: _currentTenantId }, args[1]);
          }
          return (bTarget as any).insert(data, args[1]);
        };
      }
      if (bProp === "upsert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return (bTarget as any).upsert(data.map((item: any) => ({ ...item, tenant_id: _currentTenantId })), args[1]);
          }
          if (data && typeof data === "object") {
            return (bTarget as any).upsert({ ...data, tenant_id: _currentTenantId }, args[1]);
          }
          return (bTarget as any).upsert(data, args[1]);
        };
      }
      return Reflect.get(bTarget, bProp, bReceiver);
    },
  });
}

export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return (table: string) => addTenantFilter(table, target.from(table));
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof rawSupabase;

// Converts snake_case DB rows to camelCase (frontend expects camelCase from original Prisma API)
export function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === "object" && obj.constructor === Object) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = toCamel(value);
    }
    return result;
  }
  return obj;
}


