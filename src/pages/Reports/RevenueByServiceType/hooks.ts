import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type { GlobalFilters } from "../types";

export interface ServiceTypeRow {
  name: string;
  category: string;
  department: string;
  total: number;
  count: number;
}

export interface ServiceTypeCategory {
  category: string;
  total: number;
  items: ServiceTypeRow[];
}

export interface ServiceTypeReportData {
  totalCollected: number;
  all: ServiceTypeRow[];
  byCategory: ServiceTypeCategory[];
  labTypes: number;
  radiologyTypes: number;
}

const EMPTY_STATE: ServiceTypeReportData = {
  totalCollected: 0,
  all: [],
  byCategory: [],
  labTypes: 0,
  radiologyTypes: 0,
};

const LAB_RADIOLOGY_SOURCE_TYPES = ["Lab", "Radiology", "Lab & Radiology"];

function sourceDepartment(sourceType: string): string {
  if (sourceType === "Lab") return "Lab";
  if (sourceType === "Radiology") return "Radiology";
  return "Lab & Radiology";
}

async function fetchServiceTypeReport(filters: GlobalFilters): Promise<ServiceTypeReportData> {
  const from = filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : null;
  const to = filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : null;

  let query = (supabase as any)
    .from("invoices")
    .select("id, status, source_type, paid_at, items:invoice_items(id, description, category, total)")
    .eq("status", "Paid")
    .in("source_type", LAB_RADIOLOGY_SOURCE_TYPES);

  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", to);

  const { data, error } = await query;

  if (error || !data) return EMPTY_STATE;

  const rows: ServiceTypeRow[] = [];

  for (const inv of toCamel(data) as any[]) {
    const dept = sourceDepartment(inv.sourceType ?? "Lab & Radiology");
    const items = inv.items || [];
    for (const item of items) {
      const name = item.description?.trim();
      if (!name) continue;
      const amount = Number(item.total ?? 0);
      if (!amount) continue;
      const category = item.category?.trim() || "Uncategorized";
      rows.push({ name, category, department: dept, total: amount, count: 1 });
    }
  }

  const aggregate = (list: ServiceTypeRow[]): ServiceTypeRow[] => {
    const map = new Map<string, ServiceTypeRow>();
    for (const r of list) {
      const key = `${r.category}::${r.name}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += r.total;
        existing.count += r.count;
      } else {
        map.set(key, { ...r });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  const all = aggregate(rows);

  const byCategoryMap = new Map<string, ServiceTypeRow[]>();
  for (const row of all) {
    const list = byCategoryMap.get(row.category) ?? [];
    list.push(row);
    byCategoryMap.set(row.category, list);
  }

  const byCategory: ServiceTypeCategory[] = Array.from(byCategoryMap.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.total - a.total),
      total: items.reduce((s, r) => s + r.total, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const totalCollected = all.reduce((s, r) => s + r.total, 0);

  const labTypes = new Set(all.filter((r) => r.department === "Lab").map((r) => r.name)).size;
  const radiologyTypes = new Set(all.filter((r) => r.department === "Radiology").map((r) => r.name)).size;

  return { totalCollected, all, byCategory, labTypes, radiologyTypes };
}

export function useServiceTypeReport(filters: GlobalFilters) {
  return useQuery({
    queryKey: ["reports", "service-type", filters.dateFrom ?? "", filters.dateTo ?? ""],
    queryFn: async () => {
      try {
        return await fetchServiceTypeReport(filters);
      } catch {
        return EMPTY_STATE;
      }
    },
    staleTime: 30_000,
  });
}
