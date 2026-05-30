import { useState } from "react";
import { Users, ClipboardCheck, BarChart3, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import MetricCard from "./components/MetricCard";
import GlobalFilterBar from "./components/GlobalFilterBar";
import DrillDownModal from "./components/DrillDownModal";
import { useStaffMetrics, useDrillDownData, getMetricColumns } from "./hooks";
import type { GlobalFilters, MetricKey } from "./types";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono tabular-nums">
          {p.name}: {p.name.includes("Rate") ? `${p.value}%` : p.value}
        </p>
      ))}
    </div>
  );
};

const consultationTrendData = [
  { day: "Mon", consultations: 82, doctors: 12 },
  { day: "Tue", consultations: 95, doctors: 14 },
  { day: "Wed", consultations: 78, doctors: 11 },
  { day: "Thu", consultations: 88, doctors: 13 },
  { day: "Fri", consultations: 92, doctors: 14 },
  { day: "Sat", consultations: 45, doctors: 6 },
  { day: "Sun", consultations: 32, doctors: 5 },
];

const attendanceData = [
  { name: "On Duty", value: 65 },
  { name: "Off-Duty", value: 20 },
  { name: "On Leave", value: 10 },
  { name: "Sick", value: 5 },
];

export default function StaffReports() {
  const [filters, setFilters] = useState<GlobalFilters>({
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    department: "all",
  });

  const [drillDown, setDrillDown] = useState<{ open: boolean; metricKey: MetricKey; label: string }>({
    open: false,
    metricKey: "active-personnel",
    label: "",
  });

  const { data: staff, isLoading } = useStaffMetrics(filters);
  const { data: drillData, isLoading: drillLoading } = useDrillDownData(
    drillDown.metricKey,
    drillDown.open ? filters : undefined
  );

  const handleMetricClick = (key: MetricKey, label: string) => {
    setDrillDown({ open: true, metricKey: key, label });
  };

  const chartColors = { violet: "#8b5cf6", rose: "#f43f5e", indigo: "#6366f1", emerald: "#10b981" };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Staff Reports</h1>
        <p className="text-xs text-slate-500">Personnel performance, attendance & consultation load analytics</p>
      </div>

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Personnel"
          value={staff ? String(staff.activePersonnel) : "—"}
          trend={staff?.activePersonnelTrend}
          icon={Users}
          color="violet"
          loading={isLoading}
          onClick={() => handleMetricClick("active-personnel", "Staff — Active Personnel")}
        />
        <MetricCard
          label="Consultations Today"
          value={staff ? String(staff.consultationsToday) : "—"}
          trend={staff?.consultationsTrend}
          icon={ClipboardCheck}
          color="rose"
          loading={isLoading}
          onClick={() => handleMetricClick("consultations", "Staff — Consultations Today")}
        />
        <MetricCard
          label="Task Completion"
          value={staff ? `${staff.taskCompletionRate}%` : "—"}
          trend={staff?.taskCompletionTrend}
          icon={BarChart3}
          color="indigo"
          loading={isLoading}
          onClick={() => handleMetricClick("task-completion", "Staff — Task Completion")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Consultation Load Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[220px] h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consultationTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line yAxisId="left" type="monotone" dataKey="consultations" name="Consultations" stroke={chartColors.violet} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1500} />
                  <Line yAxisId="right" type="monotone" dataKey="doctors" name="Active Doctors" stroke={chartColors.emerald} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Staff Availability Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[220px] h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Percentage" fill={chartColors.violet} radius={[4, 4, 0, 0]} animationDuration={1200} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <DrillDownModal
        open={drillDown.open}
        onClose={() => setDrillDown({ ...drillDown, open: false })}
        title={drillDown.label}
        records={drillData ?? []}
        columns={getMetricColumns(drillDown.metricKey)}
        loading={drillLoading}
      />
    </div>
  );
}
