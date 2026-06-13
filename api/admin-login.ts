import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.rpc("admin_login", {
    p_email: email,
    p_password: password,
  });

  if (error) return res.status(400).json({ error: error.message });
  if (!data?.success) return res.status(401).json({ error: data?.error || "Invalid credentials" });

  res.json(data);
}
