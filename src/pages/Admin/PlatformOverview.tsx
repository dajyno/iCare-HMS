import React, { useEffect, useState } from "react";
import { Building2, CreditCard, TrendingUp, Activity } from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";

interface Metrics {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  infraStatus: string;
}

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string; color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const PlatformOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalTenants: 0,
    activeSubscriptions: 0,
    mrr: 0,
    infraStatus: "Checking...",
  });

  useEffect(() => {
    async function fetchMetrics() {
      const { count: totalTenants } = await adminSupabase.from("tenants").select("*", { count: "exact", head: true });
      const { count: activeSubscriptions } = await adminSupabase.from("tenants").select("*", { count: "exact", head: true }).neq("status", "Suspended");
      const { data: tenants } = await adminSupabase.from("tenants").select("tier");
      const tierPrices: Record<string, number> = { Standard: 199, Premium: 499, Enterprise: 999 };
      const mrr = (tenants || []).reduce((sum, t) => sum + (tierPrices[t.tier as string] || 0), 0);

      setMetrics({
        totalTenants: totalTenants || 0,
        activeSubscriptions: activeSubscriptions || 0,
        mrr,
        infraStatus: "Operational",
      });
    }
    fetchMetrics();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Platform Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Building2} label="Total Tenants" value={String(metrics.totalTenants)} color="bg-blue-600" />
        <MetricCard icon={CreditCard} label="Active Subscriptions" value={String(metrics.activeSubscriptions)} color="bg-emerald-600" />
        <MetricCard icon={TrendingUp} label="Monthly Recurring Revenue" value={`$${metrics.mrr.toLocaleString()}`} color="bg-violet-600" />
        <MetricCard icon={Activity} label="Infrastructure" value={metrics.infraStatus} color={metrics.infraStatus === "Operational" ? "bg-green-600" : "bg-amber-600"} />
      </div>
    </div>
  );
};

export default PlatformOverview;
