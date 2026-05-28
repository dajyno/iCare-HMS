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

// Tables that should NOT receive automatic tenant filtering
const SKIP_TENANT_TABLES = new Set(["global_settings"]);

export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return (table: string) => {
        let query = target.from(table);
        if (_currentTenantId && !SKIP_TENANT_TABLES.has(table)) {
          query = (query as any).eq("tenant_id", _currentTenantId);
        }
        return query;
      };
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


