import { getHospitalCode } from "./hospitalConfig";

export async function generateInvoiceNumber(supabase: any, customPrefix?: string): Promise<string> {
  const code = customPrefix || getHospitalCode();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayPrefix = `${code}-${yy}${mm}${dd}-`;

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .gte("invoice_number", todayPrefix)
    .lt("invoice_number", `${todayPrefix}~~~~~`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  const parts = data?.[0]?.invoice_number ? String(data[0].invoice_number).split("-") : [];
  const lastSeq = parts.length >= 3 ? parseInt(parts[2], 10) || 0 : 0;

  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${todayPrefix}${String(lastSeq + 1).padStart(5, "0")}-${rand}`;
}