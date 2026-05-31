import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import type { RevenueDashboardData, PaymentMethod, CashierTransaction, PaymentChannel } from "./types";

const EMPTY_STATE: RevenueDashboardData = {
  summary: { totalGrossCollected: 0, digitalChannelTotal: 0, cashAtHand: 0, unreconciledDiscrepancy: 0 },
  transactions: [],
  channels: [
    { method: "POS", percentage: 0, amount: 0 },
    { method: "Transfer", percentage: 0, amount: 0 },
    { method: "Cash", percentage: 0, amount: 0 },
    { method: "HMO", percentage: 0, amount: 0 },
  ],
};

function normalizePaymentMethod(raw: string | null | undefined): PaymentMethod {
  if (raw === "Card" || raw === "POS") return "POS";
  if (raw === "Bank Transfer" || raw === "Transfer") return "Transfer";
  if (raw === "Cash") return "Cash";
  if (raw === "HMO" || raw === "Insurance Split") return "HMO";
  return "POS";
}

function normalizeStatus(raw: string | null | undefined): CashierTransaction["status"] {
  if (raw === "Paid") return "Completed";
  if (raw === "Refunded") return "Refunded";
  if (raw === "PartiallyPaid") return "Pending";
  return "Pending";
}

async function fetchRevenueData(): Promise<RevenueDashboardData> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, total_amount, amount_paid, balance, payment_method, status, paid_at, created_at, patient:patients!inner(patient_id, first_name, last_name), department, source_type")
    .or(`paid_at.gte.${today}T00:00:00.000Z,paid_at.lte.${today}T23:59:59.999Z,created_at.gte.${today}T00:00:00.000Z,created_at.lte.${today}T23:59:59.999Z`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !invoices || invoices.length === 0) return EMPTY_STATE;

  const transactions: CashierTransaction[] = (invoices as any[]).map((inv: any) => ({
    id: typeof inv.id === "string" ? inv.id.slice(0, 8).toUpperCase() : `TXN-${Math.random().toString(36).slice(2, 6)}`,
    patientName: inv.patient
      ? `${inv.patient.first_name ?? ""} ${inv.patient.last_name ?? ""}`.trim() || "Unknown"
      : "Unknown",
    patientId: inv.patient?.patient_id ?? "—",
    department: inv.department ?? inv.source_type ?? "General",
    paymentMethod: normalizePaymentMethod(inv.payment_method),
    amount: inv.total_amount ?? 0,
    status: normalizeStatus(inv.status),
    timestamp: inv.paid_at ?? inv.created_at,
  }));

  let totalGrossCollected = 0;
  let digitalChannelTotal = 0;
  let cashAtHand = 0;
  const methodTotals: Record<string, number> = {};
  let partialBalanceSum = 0;

  for (const t of transactions) {
    if (t.status === "Completed") {
      totalGrossCollected += t.amount;
      methodTotals[t.paymentMethod] = (methodTotals[t.paymentMethod] ?? 0) + t.amount;
      if (t.paymentMethod === "POS" || t.paymentMethod === "Transfer") {
        digitalChannelTotal += t.amount;
      } else if (t.paymentMethod === "Cash") {
        cashAtHand += t.amount;
      }
    } else if (t.status === "Pending") {
      const inv = (invoices as any[]).find(
        (i: any) => typeof i.id === "string" && i.id.slice(0, 8).toUpperCase() === t.id
      );
      partialBalanceSum += inv?.balance ?? 0;
    }
  }

  let unreconciledDiscrepancy = partialBalanceSum;

  try {
    const { data: pendingIncome } = await supabase
      .from("accounting_income")
      .select("amount")
      .eq("status", "Pending")
      .gte("date", today);
    if (pendingIncome) {
      const pendingSum = (pendingIncome as any[]).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
      unreconciledDiscrepancy += pendingSum;
    }
  } catch {
    // accounting_income table may not exist yet
  }

  const totalFromMethods = Object.values(methodTotals).reduce((a, b) => a + b, 0) || 1;
  const channels: PaymentChannel[] = (["POS", "Transfer", "Cash", "HMO"] as PaymentMethod[]).map((method) => ({
    method,
    percentage: Math.round(((methodTotals[method] ?? 0) / totalFromMethods) * 100),
    amount: methodTotals[method] ?? 0,
  }));

  const hasRealData = channels.some((c) => c.amount > 0);

  return {
    summary: { totalGrossCollected, digitalChannelTotal, cashAtHand, unreconciledDiscrepancy },
    transactions,
    channels: hasRealData ? channels : EMPTY_STATE.channels,
  };
}

export function useRevenueDashboard() {
  return useQuery({
    queryKey: ["revenue", "dashboard"],
    queryFn: async () => {
      try {
        return await fetchRevenueData();
      } catch {
        return EMPTY_STATE;
      }
    },
    staleTime: 30_000,
  });
}
