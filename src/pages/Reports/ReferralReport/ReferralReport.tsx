import { useMemo, useState } from "react";
import { FileClock, Handshake, TrendingUp, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GlobalFilterBar from "../components/GlobalFilterBar";
import { useReferralReport } from "./hooks";
import ReferralDetailModal from "./ReferralDetailModal";
import type { GlobalFilters } from "../types";

const naira = (v: number) =>
  `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReferralReport() {
  const [filters, setFilters] = useState<GlobalFilters>({
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    department: "all",
  });
  const [search, setSearch] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);

  const { data, isLoading } = useReferralReport(filters);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.referredBy.toLowerCase().includes(q));
  }, [data, search]);

  const detailItems = selectedReferrer ? (data?.detail ?? {})[selectedReferrer] ?? [] : [];
  const range = `${filters.dateFrom ?? ""}__${filters.dateTo ?? ""}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Referrals</h1>
        <p className="text-xs text-slate-500">
          Lab requests grouped by referring person, with counts and paid revenue
        </p>
      </div>

      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search referrers..."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileClock className="w-4 h-4 text-sky-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Total Referrals</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : String(data?.totalReferrals ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Referral Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : naira(data?.totalRevenue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Unique Referrers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : String(data?.uniqueReferrers ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-sky-500" />
            <CardTitle className="text-sm font-bold text-slate-700">Referrals by Person</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-xs text-slate-400 p-4">Loading...</div>
          ) : (data?.rows ?? []).length === 0 ? (
            <div className="text-xs text-slate-400 p-4">No referred requests in the selected range</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-xs text-slate-400 p-4">No referrers match "{search}"</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-semibold">Referred By</th>
                    <th className="py-2 font-semibold text-right">Requests</th>
                    <th className="py-2 font-semibold text-right">Paid Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.referredBy} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedReferrer(row.referredBy)}
                          className="text-[#005EB8] hover:text-[#004d9a] hover:underline font-medium"
                          title="View referred tests/exams"
                        >
                          {row.referredBy}
                        </button>
                      </td>
                      <td className="py-2.5 text-right text-slate-500 tabular-nums">{row.requestCount}</td>
                      <td className="py-2.5 text-right font-mono text-slate-800 tabular-nums">
                        {naira(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReferralDetailModal
        referrer={selectedReferrer}
        items={detailItems}
        range={range}
        onClose={() => setSelectedReferrer(null)}
      />
    </div>
  );
}
