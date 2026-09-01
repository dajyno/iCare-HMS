import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type { GlobalFilters } from "../types";

export interface ReferralRow {
  referredBy: string;
  requestCount: number;
  revenue: number;
}

export interface ReferralDetailItem {
  id: string;
  source: "Lab" | "Radiology";
  name: string;
  date: string;
  patientName?: string;
  patientFolderNo?: string;
  revenue: number;
}

export interface ReferralReportData {
  totalReferrals: number;
  totalRevenue: number;
  uniqueReferrers: number;
  rows: ReferralRow[];
  detail: Record<string, ReferralDetailItem[]>;
}

const EMPTY_STATE: ReferralReportData = {
  totalReferrals: 0,
  totalRevenue: 0,
  uniqueReferrers: 0,
  rows: [],
  detail: {},
};

interface RawRequest {
  id: string;
  referred_by?: string;
  invoice_id?: string;
  created_at: string;
  source: "Lab" | "Radiology";
  name: string;
  patient?: { first_name?: string; last_name?: string; patient_id?: string } | null;
}

async function fetchReferralReport(filters: GlobalFilters): Promise<ReferralReportData> {
  const from = filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : null;
  const to = filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : null;

  const buildLabQuery = () => {
    let q = (supabase as any)
      .from("lab_requests")
      .select(
        "id, referred_by, invoice_id, created_at, test:lab_tests(name), patient:patients(first_name, last_name, patient_id)"
      )
      .not("referred_by", "is", null);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    return q;
  };

  const buildRadQuery = () => {
    let q = (supabase as any)
      .from("radiology_requests")
      .select(
        "id, referred_by, invoice_id, created_at, exam:radiology_exams(name), patient:patients(first_name, last_name, patient_id)"
      )
      .not("referred_by", "is", null);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    return q;
  };

  const [labResult, radResult] = await Promise.all([buildLabQuery(), buildRadQuery()]);

  if (labResult.error || radResult.error) return EMPTY_STATE;

  const reqs: RawRequest[] = [
    ...((labResult.data as any[]) || []).map((r) => ({
      id: r.id,
      referred_by: r.referred_by,
      invoice_id: r.invoice_id,
      created_at: r.created_at,
      source: "Lab" as const,
      name: r.test?.name ?? "",
      patient: r.patient,
    })),
    ...((radResult.data as any[]) || []).map((r) => ({
      id: r.id,
      referred_by: r.referred_by,
      invoice_id: r.invoice_id,
      created_at: r.created_at,
      source: "Radiology" as const,
      name: r.exam?.name ?? "",
      patient: r.patient,
    })),
  ];

  const invoiceIds = Array.from(
    new Set(reqs.map((r) => r.invoice_id).filter(Boolean))
  ) as string[];

  let invoices: any[] = [];
  let items = new Map<string, number>();
  if (invoiceIds.length > 0) {
    const [{ data: invData, error: invError }, { data: itemsData, error: itemsError }] =
      await Promise.all([
        (supabase as any).from("invoices").select("id, status").in("id", invoiceIds),
        (supabase as any)
          .from("invoice_items")
          .select("invoice_id, description, total")
          .in("invoice_id", invoiceIds),
      ]);
    if (invError || itemsError) return EMPTY_STATE;
    invoices = invData as any[];

    // Total money per invoice (paid only) for the summary row.
    const paidIds = new Set(
      (invoices.filter((i) => i.status === "Paid") || []).map((i) => i.id)
    );
    for (const it of (itemsData as any[]) || []) {
      if (!paidIds.has(it.invoice_id)) continue;
      items.set(it.invoice_id, (items.get(it.invoice_id) ?? 0) + Number(it.total ?? 0));
    }
  }

  const paidInvoiceIds = new Set<unknown>();
  for (const inv of invoices) {
    if (inv.status === "Paid") paidInvoiceIds.add(inv.id);
  }

  return buildReport(reqs, items, paidInvoiceIds);
}

function buildReport(
  reqs: RawRequest[],
  invoiceTotals: Map<string, number>,
  paidInvoiceIds: Set<unknown>
): ReferralReportData {
  const detailMap = new Map<string, ReferralDetailItem[]>();

  for (const req of reqs) {
    const name = req.referred_by?.trim();
    if (!name) continue;
    const item: ReferralDetailItem = {
      id: req.id,
      source: req.source,
      name: req.name || "Unknown",
      date: req.created_at,
      patientName: req.patient
        ? `${req.patient.first_name ?? ""} ${req.patient.last_name ?? ""}`.trim()
        : undefined,
      patientFolderNo: req.patient?.patient_id ?? undefined,
      revenue: req.invoice_id && paidInvoiceIds.has(req.invoice_id)
        ? invoiceTotals.get(req.invoice_id) ?? 0
        : 0,
    };
    const list = detailMap.get(name) ?? [];
    list.push(item);
    detailMap.set(name, list);
  }

  const detail: Record<string, ReferralDetailItem[]> = {};
  const rows: ReferralRow[] = [];

  for (const [name, list] of detailMap.entries()) {
    const sorted = list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    detail[name] = sorted;
    const revenue = sorted.reduce((s, it) => s + it.revenue, 0);
    rows.push({ referredBy: name, requestCount: sorted.length, revenue });
  }

  rows.sort((a, b) => b.revenue - a.revenue);

  return {
    totalReferrals: rows.reduce((s, r) => s + r.requestCount, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    uniqueReferrers: rows.length,
    rows,
    detail,
  };
}

export function useReferralReport(filters: GlobalFilters) {
  return useQuery({
    queryKey: ["reports", "referrals", filters.dateFrom ?? "", filters.dateTo ?? ""],
    queryFn: async () => {
      try {
        return await fetchReferralReport(filters);
      } catch {
        return EMPTY_STATE;
      }
    },
    staleTime: 30_000,
  });
}
