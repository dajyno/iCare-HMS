import { useState } from "react";
import { BarChart3, Users, Bed, Calendar, Clock, ClipboardCheck } from "lucide-react";
import type { ComponentType } from "react";
import MetricCard from "./components/MetricCard";
import CategorySection from "./components/CategorySection";
import GlobalFilterBar from "./components/GlobalFilterBar";
import DrillDownModal from "./components/DrillDownModal";
import { useReportsDashboard, useDrillDownData, getMetricColumns } from "./hooks";
import type { GlobalFilters, MetricKey } from "./types";

const clinicalMetrics: { key: MetricKey; label: string; icon: ComponentType<{ className?: string }>; color: string }[] = [
  { key: "bed-occupancy", label: "Bed Occupancy", icon: Bed, color: "sky" },
  { key: "new-registrations", label: "New Registrations", icon: Calendar, color: "emerald" },
  { key: "alos", label: "Avg Length of Stay", icon: Clock, color: "amber" },
];

const staffMetrics: { key: MetricKey; label: string; icon: ComponentType<{ className?: string }>; color: string }[] = [
  { key: "active-personnel", label: "Active Personnel", icon: Users, color: "violet" },
  { key: "consultations", label: "Consultations Today", icon: ClipboardCheck, color: "rose" },
  { key: "task-completion", label: "Task Completion", icon: BarChart3, color: "indigo" },
];

export default function ReportsHub() {
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

  const { data, isLoading } = useReportsDashboard(filters);
  const { data: drillData, isLoading: drillLoading } = useDrillDownData(
    drillDown.metricKey,
    drillDown.open ? filters : undefined
  );

  const handleMetricClick = (key: MetricKey, label: string) => {
    setDrillDown({ open: true, metricKey: key, label });
  };

  const clinical = data?.clinical;
  const staff = data?.staff;

  const clinicalValues: Record<string, string> = {
    "bed-occupancy": clinical ? `${clinical.bedOccupancyRate}%` : "—",
    "new-registrations": clinical ? String(clinical.newRegistrationsToday) : "—",
    "alos": clinical ? `${clinical.averageLengthOfStay.toFixed(1)} days` : "—",
  };

  const staffValues: Record<string, string> = {
    "active-personnel": staff ? String(staff.activePersonnel) : "—",
    "consultations": staff ? String(staff.consultationsToday) : "—",
    "task-completion": staff ? `${staff.taskCompletionRate}%` : "—",
  };

  const clinicalTrends: Record<string, { direction: "up" | "down" | "neutral"; value: string } | undefined> = {
    "bed-occupancy": clinical?.bedOccupancyTrend,
    "new-registrations": clinical?.newRegistrationsTrend,
    "alos": clinical?.alosTrend,
  };

  const staffTrends: Record<string, { direction: "up" | "down" | "neutral"; value: string } | undefined> = {
    "active-personnel": staff?.activePersonnelTrend,
    "consultations": staff?.consultationsTrend,
    "task-completion": staff?.taskCompletionTrend,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics Hub</h1>
        <p className="text-xs text-slate-500">Real-time hospital performance command center</p>
      </div>

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <CategorySection icon={Bed} title="Clinical Performance" description="Patient influx, bed utilization & efficiency" color="sky">
        {clinicalMetrics.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={clinicalValues[m.key]}
            trend={clinicalTrends[m.key]}
            icon={m.icon}
            color={m.color}
            loading={isLoading}
            onClick={() => handleMetricClick(m.key, `Clinical — ${m.label}`)}
          />
        ))}
      </CategorySection>

      <CategorySection icon={Users} title="Staff Performance" description="Personnel activity, consultation load & task fulfillment" color="violet">
        {staffMetrics.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={staffValues[m.key]}
            trend={staffTrends[m.key]}
            icon={m.icon}
            color={m.color}
            loading={isLoading}
            onClick={() => handleMetricClick(m.key, `Staff — ${m.label}`)}
          />
        ))}
      </CategorySection>

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
