import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({
      ok: false,
      error: "Server misconfiguration: missing Supabase credentials",
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { error } = await supabase.from("departments").select("id").limit(1);

    if (error) {
      return res.status(502).json({ ok: false, error: error.message });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "Keepalive failed" });
  }
}
