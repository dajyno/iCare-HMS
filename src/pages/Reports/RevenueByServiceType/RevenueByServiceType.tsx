import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, FlaskConical, ScanLine, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import GlobalFilterBar from "../components/GlobalFilterBar";
import { useServiceTypeReport } from "./hooks";
import type { GlobalFilters } from "../types";

const naira = (v: number) =>
  `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono tabular-nums">
          {naira(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
};

export default function RevenueByServiceType() {
  const [filters, setFilters] = useState<GlobalFilters>({
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    department: "all",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useServiceTypeReport(filters);

  const chartData = useMemo(() => {
    const top = (data?.all ?? []).slice(0, 12).map((r) => ({ name: r.name, total: r.total }));
    return top;
  }, [data]);

  const toggle = (category: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Revenue by Service Type</h1>
        <p className="text-xs text-slate-500">
          Cash collected from Lab tests &amp; Radiology exams, grouped by test/exam type
        </p>
      </div>

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Total Collected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : naira(data?.totalCollected ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Lab Test Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : String(data?.labTypes ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Radiology Exam Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {isLoading ? "—" : String(data?.radiologyTypes ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <CardTitle className="text-sm font-bold text-slate-700">Top Tests &amp; Exams by Revenue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[220px] h-80">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading...</div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No paid Lab/Radiology revenue in the selected range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${Number(v).toLocaleString()}`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Collected" fill="#0ea5e9" radius={[0, 4, 4, 0]} animationDuration={1200} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Breakdown by Category</h2>
        {isLoading ? (
          <div className="text-xs text-slate-400 p-4">Loading...</div>
        ) : (data?.byCategory ?? []).length === 0 ? (
          <div className="text-xs text-slate-400 p-4">No data in the selected range</div>
        ) : (
          (data?.byCategory ?? []).map((cat) => {
            const isOpen = expanded.has(cat.category);
            return (
              <Card key={cat.category} className="border-none shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => toggle(cat.category)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    <span className="text-sm font-bold text-slate-800">{cat.category}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {naira(cat.total)}
                  </span>
                </button>
                {isOpen && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <th className="py-2 font-semibold">Test / Exam</th>
                            <th className="py-2 font-semibold text-right">Qty</th>
                            <th className="py-2 font-semibold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.map((row) => (
                            <tr key={row.name} className="border-b border-slate-50 last:border-0">
                              <td className="py-2 text-slate-700">{row.name}</td>
                              <td className="py-2 text-right text-slate-500 tabular-nums">{row.count}</td>
                              <td className="py-2 text-right font-mono text-slate-800 tabular-nums">{naira(row.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
