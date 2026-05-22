import React, { useEffect, useState } from "react";
import {
  Building2, CreditCard, TrendingUp, Stethoscope, Users,
  UserRound, BedDouble, DollarSign
} from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";

const tierPrices: Record<string, number> = { Standard: 199, Premium: 499, Enterprise: 999 };
const tierIcons: Record<string, React.ElementType> = { Standard: Building2, Premium: TrendingUp, Enterprise: DollarSign };
const tierColors: Record<string, string> = { Standard: "bg-blue-500/20 text-blue-400", Premium: "bg-violet-500/20 text-violet-400", Enterprise: "bg-amber-500/20 text-amber-400" };

interface Metrics {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  totalRevenue: number;
  doctors: number;
  systemUsers: number;
  patients: number;
  beds: number;
  byTier: Record<string, { count: number; mrr: number }>;
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

const TierCard: React.FC<{ name: string; price: number; count: number; mrr: number }> = ({ name, price, count, mrr: tierMrr }) => {
  const Icon = tierIcons[name] || Building2;
  const color = tierColors[name] || "bg-slate-500/20 text-slate-400";
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold text-white">${price}<span className="text-xs font-normal text-slate-400">/mo</span></span>
      </div>
      <h3 className="text-base font-bold text-white mb-1">{name}</h3>
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span>{count} tenant{count !== 1 ? "s" : ""}</span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="text-emerald-400 font-semibold">${tierMrr.toLocaleString()}/mo</span>
      </div>
    </div>
  );
};

const PlatformOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalTenants: 0,
    activeSubscriptions: 0,
    mrr: 0,
    totalRevenue: 0,
    doctors: 0,
    systemUsers: 0,
    patients: 0,
    beds: 0,
    byTier: {},
  });

  useEffect(() => {
    async function fetchMetrics() {
      const [
        { count: totalTenants },
        { count: activeSubscriptions },
        { data: tenants },
        { count: systemUsers },
        { count: doctors },
        { count: patients },
        { data: wards },
      ] = await Promise.all([
        adminSupabase.from("tenants").select("*", { count: "exact", head: true }),
        adminSupabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "Active"),
        adminSupabase.from("tenants").select("tier,status"),
        adminSupabase.from("users").select("*", { count: "exact", head: true }),
        adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("role", "Doctor"),
        adminSupabase.from("patients").select("*", { count: "exact", head: true }),
        adminSupabase.from("wards").select("beds_count"),
      ]);

      const mrr = (tenants || []).reduce((sum, t) => sum + (tierPrices[t.tier as string] || 0), 0);
      const byTier: Record<string, { count: number; mrr: number }> = {};
      (tenants || []).forEach((t) => {
        const tier = (t.tier as string) || "Standard";
        if (!byTier[tier]) byTier[tier] = { count: 0, mrr: 0 };
        byTier[tier].count++;
        byTier[tier].mrr += tierPrices[tier] || 0;
      });

      const beds = (wards || []).reduce((sum: number, w: any) => sum + (w.beds_count || 0), 0);

      setMetrics({
        totalTenants: totalTenants || 0,
        activeSubscriptions: activeSubscriptions || 0,
        mrr,
        totalRevenue: mrr * 12,
        doctors: doctors || 0,
        systemUsers: systemUsers || 0,
        patients: patients || 0,
        beds,
        byTier,
      });
    }
    fetchMetrics();
  }, []);

  const m = metrics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Platform Overview</h1>
        <p className="text-xs text-slate-400 mt-1">Real-time snapshot of your SaaS platform</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Building2} label="Total Tenants" value={String(m.totalTenants)} color="bg-blue-600" />
        <MetricCard icon={CreditCard} label="Active Subscriptions" value={String(m.activeSubscriptions)} color="bg-emerald-600" />
        <MetricCard icon={TrendingUp} label="Monthly Revenue (MRR)" value={`$${m.mrr.toLocaleString()}`} color="bg-violet-600" />
        <MetricCard icon={DollarSign} label="Total Revenue (ARR)" value={`$${m.totalRevenue.toLocaleString()}`} color="bg-green-600" />
        <MetricCard icon={Stethoscope} label="Doctors" value={String(m.doctors)} color="bg-sky-600" />
        <MetricCard icon={Users} label="System Users" value={String(m.systemUsers)} color="bg-indigo-600" />
        <MetricCard icon={UserRound} label="Patients" value={String(m.patients)} color="bg-amber-600" />
        <MetricCard icon={BedDouble} label="Beds (Capacity)" value={String(m.beds)} color="bg-rose-600" />
      </div>

      {/* Subscription Breakdown */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4">Subscription Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Standard", "Premium", "Enterprise"].map((name) => {
            const t = m.byTier[name] || { count: 0, mrr: 0 };
            return <TierCard key={name} name={name} price={tierPrices[name]} count={t.count} mrr={t.mrr} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default PlatformOverview;
