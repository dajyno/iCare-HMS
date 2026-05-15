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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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

// Ensures the authenticated user has a row in public.users (for doctor_id FK)
export async function ensureUserProfile(user: any) {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("users").insert({
      id: user.id,
      email: user.email || null,
      full_name: user.fullName || null,
      role: user.role || "doctor",
    });
    if (error && error.code !== "23505") throw error;
  }
}
