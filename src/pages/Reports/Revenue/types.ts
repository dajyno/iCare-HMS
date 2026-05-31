export type PaymentMethod = "Cash" | "POS" | "Transfer" | "HMO";

export interface RevenueSummary {
  totalGrossCollected: number;
  digitalChannelTotal: number;
  cashAtHand: number;
  unreconciledDiscrepancy: number;
}

export interface CashierTransaction {
  id: string;
  patientName: string;
  patientId: string;
  department: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: "Completed" | "Pending" | "Failed" | "Refunded";
  timestamp: string;
}

export interface PaymentChannel {
  method: PaymentMethod;
  percentage: number;
  amount: number;
}

export interface RevenueDashboardData {
  summary: RevenueSummary;
  transactions: CashierTransaction[];
  channels: PaymentChannel[];
}

export const PAYMENT_METHOD_STYLES: Record<PaymentMethod, { badge: string; dot: string }> = {
  Cash: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  POS: { badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  Transfer: { badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  HMO: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
};

export const TRANSACTION_STATUS_STYLES: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Refunded: "bg-slate-50 text-slate-500 border-slate-200",
};
