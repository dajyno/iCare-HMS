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
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [paymentsResult, invoicesResult] = await Promise.all([
    supabase
      .from("accounting_income")
      .select("id, amount, payment_method, patient_id, patient_name, description, category, created_at")
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("id, total_amount, amount_paid, balance, payment_method, status, created_at, paid_at, invoice_number, source_type, patient:patients!inner(patient_id, first_name, last_name)")
      .or(`paid_at.gte.${todayStart},and(status.eq.PartiallyPaid,amount_paid.gt.0)`)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(50),
  ]);

  const payments = paymentsResult.data as any[] | null;
  const newInvoices = invoicesResult.data as any[] | null;
  if (paymentsResult.error || invoicesResult.error) return EMPTY_STATE;

  const paidInvoiceNumbers = new Set<string>();
  if (payments) {
    for (const p of payments) {
      const m = (p.description ?? "").match(/Payment for\s+(\S+)/);
      if (m) paidInvoiceNumbers.add(m[1]);
    }
  }

  const transactions: CashierTransaction[] = [];

  if (payments) {
    for (const p of payments) {
      transactions.push({
        id: typeof p.id === "string" ? p.id.slice(0, 8).toUpperCase() : `TXN-${Math.random().toString(36).slice(2, 6)}`,
        patientName: p.patient_name ?? "Unknown",
        patientId: p.patient_id ?? "—",
        department: p.category ?? "General",
        paymentMethod: normalizePaymentMethod(p.payment_method),
        amount: p.amount ?? 0,
        status: "Completed",
        timestamp: p.created_at,
      });
    }
  }

  if (newInvoices) {
    for (const inv of newInvoices) {
      if (paidInvoiceNumbers.has(inv.invoice_number ?? "")) continue;
      transactions.push({
        id: typeof inv.id === "string" ? inv.id.slice(0, 8).toUpperCase() : `TXN-${Math.random().toString(36).slice(2, 6)}`,
        patientName: inv.patient
          ? `${inv.patient.first_name ?? ""} ${inv.patient.last_name ?? ""}`.trim() || "Unknown"
          : "Unknown",
        patientId: inv.patient?.patient_id ?? "—",
        department: inv.source_type ?? "General",
        paymentMethod: normalizePaymentMethod(inv.payment_method),
        amount: inv.total_amount ?? 0,
        status: normalizeStatus(inv.status),
        timestamp: inv.created_at,
      });
    }
  }

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
    } else if (t.status === "Pending" && newInvoices) {
      const inv = newInvoices.find(
        (i: any) => i.patient?.patient_id === t.patientId && typeof i.id === "string" && i.id.slice(0, 8).toUpperCase() === t.id
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
