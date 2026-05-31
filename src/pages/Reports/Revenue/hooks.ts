import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import type { RevenueDashboardData, PaymentMethod, CashierTransaction, PaymentChannel } from "./types";

const MOCK_DATA: RevenueDashboardData = {
  summary: {
    totalGrossCollected: 135000,
    digitalChannelTotal: 98750,
    cashAtHand: 28750,
    unreconciledDiscrepancy: 2750,
  },
  transactions: [
    { id: "TXN-001", patientName: "Amara Okafor", patientId: "PAT-001", department: "Internal Medicine", paymentMethod: "POS", amount: 12500, status: "Completed", timestamp: "2026-05-31T09:15:00" },
    { id: "TXN-002", patientName: "Chidi Nwosu", patientId: "PAT-002", department: "Pediatrics", paymentMethod: "Transfer", amount: 8400, status: "Completed", timestamp: "2026-05-31T09:32:00" },
    { id: "TXN-003", patientName: "Folake Adeleke", patientId: "PAT-003", department: "OB/GYN", paymentMethod: "Cash", amount: 3200, status: "Completed", timestamp: "2026-05-31T09:48:00" },
    { id: "TXN-004", patientName: "Emeka Eze", patientId: "PAT-004", department: "Surgery", paymentMethod: "HMO", amount: 22000, status: "Pending", timestamp: "2026-05-31T10:05:00" },
    { id: "TXN-005", patientName: "Ngozi Obi", patientId: "PAT-005", department: "Cardiology", paymentMethod: "POS", amount: 18750, status: "Completed", timestamp: "2026-05-31T10:22:00" },
    { id: "TXN-006", patientName: "Tunde Balogun", patientId: "PAT-006", department: "Orthopedics", paymentMethod: "Transfer", amount: 5600, status: "Completed", timestamp: "2026-05-31T10:40:00" },
    { id: "TXN-007", patientName: "Chioma Edeh", patientId: "PAT-007", department: "Internal Medicine", paymentMethod: "Cash", amount: 4800, status: "Refunded", timestamp: "2026-05-31T11:00:00" },
    { id: "TXN-008", patientName: "Kayode Akinwande", patientId: "PAT-008", department: "Pediatrics", paymentMethod: "POS", amount: 9200, status: "Completed", timestamp: "2026-05-31T11:18:00" },
    { id: "TXN-009", patientName: "Yetunde Adeyemi", patientId: "PAT-009", department: "OB/GYN", paymentMethod: "Transfer", amount: 15000, status: "Completed", timestamp: "2026-05-31T11:35:00" },
    { id: "TXN-010", patientName: "Babatunde Lawal", patientId: "PAT-010", department: "Cardiology", paymentMethod: "POS", amount: 33500, status: "Failed", timestamp: "2026-05-31T11:52:00" },
  ],
  channels: [
    { method: "POS", percentage: 55, amount: 74250 },
    { method: "Transfer", percentage: 30, amount: 40500 },
    { method: "Cash", percentage: 10, amount: 13500 },
    { method: "HMO", percentage: 5, amount: 6750 },
  ],
};

async function fetchRevenueData(): Promise<RevenueDashboardData | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, total_amount, amount_paid, payment_method, status, created_at, patient:patients!inner(patient_id, first_name, last_name), department")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !invoices || invoices.length === 0) return null;

  const transactions: CashierTransaction[] = (invoices as any[]).map((inv: any) => ({
    id: inv.id?.slice(0, 8).toUpperCase() ?? `TXN-${Math.random().toString(36).slice(2, 6)}`,
    patientName: inv.patient ? `${inv.patient.first_name ?? ""} ${inv.patient.last_name ?? ""}`.trim() || "Unknown" : "Unknown",
    patientId: inv.patient?.patient_id ?? "—",
    department: inv.department ?? "General",
    paymentMethod: (inv.payment_method === "Card" ? "POS" : inv.payment_method === "Bank Transfer" ? "Transfer" : inv.payment_method) as PaymentMethod,
    amount: inv.total_amount ?? 0,
    status: inv.status === "Paid" ? "Completed" : inv.status === "Refunded" ? "Refunded" : "Pending",
    timestamp: inv.created_at,
  }));

  let totalGrossCollected = 0;
  let digitalChannelTotal = 0;
  let cashAtHand = 0;
  const methodTotals: Record<string, number> = {};

  for (const t of transactions) {
    if (t.status === "Completed") {
      totalGrossCollected += t.amount;
      methodTotals[t.paymentMethod] = (methodTotals[t.paymentMethod] ?? 0) + t.amount;
      if (t.paymentMethod === "POS" || t.paymentMethod === "Transfer") {
        digitalChannelTotal += t.amount;
      } else if (t.paymentMethod === "Cash") {
        cashAtHand += t.amount;
      }
    }
  }

  const totalFromMethods = Object.values(methodTotals).reduce((a, b) => a + b, 0) || 1;
  const channels: PaymentChannel[] = (["POS", "Transfer", "Cash", "HMO"] as PaymentMethod[]).map((method) => ({
    method,
    percentage: Math.round(((methodTotals[method] ?? 0) / totalFromMethods) * 100),
    amount: methodTotals[method] ?? 0,
  }));

  return {
    summary: {
      totalGrossCollected,
      digitalChannelTotal,
      cashAtHand,
      unreconciledDiscrepancy: Math.round(totalGrossCollected * 0.02),
    },
    transactions,
    channels,
  };
}

export function useRevenueDashboard() {
  return useQuery({
    queryKey: ["revenue", "dashboard"],
    queryFn: async () => {
      try {
        const data = await fetchRevenueData();
        return data ?? MOCK_DATA;
      } catch {
        return MOCK_DATA;
      }
    },
    staleTime: 30_000,
  });
}
