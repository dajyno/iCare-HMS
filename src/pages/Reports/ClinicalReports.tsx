import { useState } from "react";
import { Bed, Calendar, Clock, TrendingUp, BarChart3 } from "lucide-react";
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
import { useClinicalMetrics, useDrillDownData, getMetricColumns, useOccupancyTrend, useAlosDeptData, useConsultationTrend, useStaffAvailability } from "./hooks";
import type { GlobalFilters, MetricKey } from "./types";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono tabular-nums">
          {p.name}: {p.name.includes("Rate") ? `${p.value}%` : p.name.includes("Days") ? `${p.value} days` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ClinicalReports() {
  const [filters, setFilters] = useState<GlobalFilters>({
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    department: "all",
  });

  const [drillDown, setDrillDown] = useState<{ open: boolean; metricKey: MetricKey; label: string }>({
    open: false,
    metricKey: "bed-occupancy",
    label: "",
  });

  const { data: clinical, isLoading } = useClinicalMetrics(filters);
  const { data: drillData, isLoading: drillLoading } = useDrillDownData(
    drillDown.metricKey,
    drillDown.open ? filters : undefined
  );
  const { data: occupancyTrendData, isLoading: chartLoading1 } = useOccupancyTrend();
  const { data: alosDeptData, isLoading: chartLoading2 } = useAlosDeptData();
  const { data: consultationTrendData, isLoading: chartLoading3 } = useConsultationTrend();
  const { data: attendanceData, isLoading: chartLoading4 } = useStaffAvailability();

  const handleMetricClick = (key: MetricKey, label: string) => {
    setDrillDown({ open: true, metricKey: key, label });
  };

  const chartColors = { sky: "#0ea5e9", emerald: "#10b981", amber: "#f59e0b", violet: "#8b5cf6", rose: "#f43f5e" };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Clinical Reports</h1>
        <p className="text-xs text-slate-500">Patient influx, bed utilization & efficiency metrics</p>
      </div>

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Bed Occupancy"
          value={clinical ? `${clinical.bedOccupancyRate}%` : "—"}
          trend={clinical?.bedOccupancyTrend}
          icon={Bed}
          color="sky"
          loading={isLoading}
          onClick={() => handleMetricClick("bed-occupancy", "Clinical — Bed Occupancy")}
        />
        <MetricCard
          label="New Registrations"
          value={clinical ? String(clinical.newRegistrationsToday) : "—"}
          trend={clinical?.newRegistrationsTrend}
          icon={Calendar}
          color="emerald"
          loading={isLoading}
          onClick={() => handleMetricClick("new-registrations", "Clinical — New Registrations")}
        />
        <MetricCard
          label="Avg Length of Stay"
          value={clinical ? `${clinical.averageLengthOfStay.toFixed(1)} days` : "—"}
          trend={clinical?.alosTrend}
          icon={Clock}
          color="amber"
          loading={isLoading}
          onClick={() => handleMetricClick("alos", "Clinical — Avg Length of Stay")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Occupancy & Admissions Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[220px] h-72">
              {chartLoading1 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading...</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyTrendData ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line yAxisId="left" type="monotone" dataKey="rate" name="Occupancy Rate" stroke={chartColors.sky} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1500} />
                  <Line yAxisId="right" type="monotone" dataKey="admissions" name="Admissions" stroke={chartColors.emerald} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-bold text-slate-700">ALOS by Department</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[220px] h-72">
              {chartLoading2 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading...</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alosDeptData ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="alos" name="Avg Days" fill={chartColors.amber} radius={[0, 4, 4, 0]} animationDuration={1200} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-sm font-bold text-slate-700">Consultation Load Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[220px] h-72">
              {chartLoading3 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading...</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consultationTrendData ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              )}
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
              {chartLoading4 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading...</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Percentage" fill={chartColors.violet} radius={[4, 4, 0, 0]} animationDuration={1200} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
              )}
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
