import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "Server misconfiguration: missing Supabase credentials",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as any },
    });

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabaseAdmin.rpc("admin_login", {
      p_email: email,
      p_password: password,
    });

    if (error) return res.status(400).json({ error: error.message });
    if (!data?.success) return res.status(401).json({ error: data?.error || "Invalid credentials" });

    res.json(data);
  } catch (err: any) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
