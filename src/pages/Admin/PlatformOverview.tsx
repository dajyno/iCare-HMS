import React, { useEffect, useState } from "react";
import {
  Building2, CreditCard, TrendingUp, Stethoscope, Users,
  UserRound, BedDouble, DollarSign
} from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";

const CURRENCY = "\u20A6";
const tierIcons: Record<string, React.ElementType> = { Standard: Building2, Premium: TrendingUp, Enterprise: DollarSign };

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

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string; }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-md">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.15)]">
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const TierCard: React.FC<{ name: string; price: number; count: number; mrr: number }> = ({ name, price, count, mrr: tierMrr }) => {
  const Icon = tierIcons[name] || Building2;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-lg font-bold text-slate-900">{CURRENCY}{price.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span></span>
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{name}</h3>
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{count} tenant{count !== 1 ? "s" : ""}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="text-blue-600 font-semibold">{CURRENCY}{tierMrr.toLocaleString()}/mo</span>
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
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});

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
        { data: tiers },
      ] = await Promise.all([
        adminSupabase.from("tenants").select("*", { count: "exact", head: true }),
        adminSupabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "Active"),
        adminSupabase.from("tenants").select("tier,status"),
        adminSupabase.from("users").select("*", { count: "exact", head: true }),
        adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("role", "Doctor"),
        adminSupabase.from("patients").select("*", { count: "exact", head: true }),
        adminSupabase.from("wards").select("beds_count"),
        adminSupabase.from("subscription_tiers").select("name,monthly_price"),
      ]);

      const prices: Record<string, number> = {};
      (tiers || []).forEach((t: any) => { prices[t.name] = t.monthly_price; });
      setTierPrices(prices);

      const mrr = (tenants || []).reduce((sum, t) => sum + (prices[t.tier as string] || 0), 0);
      const byTier: Record<string, { count: number; mrr: number }> = {};
      (tenants || []).forEach((t) => {
        const tier = (t.tier as string) || "Standard";
        if (!byTier[tier]) byTier[tier] = { count: 0, mrr: 0 };
        byTier[tier].count++;
        byTier[tier].mrr += prices[tier] || 0;
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
        <h1 className="text-xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-xs text-slate-500 mt-1">Real-time snapshot of your SaaS platform</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Building2} label="Total Tenants" value={String(m.totalTenants)} />
        <MetricCard icon={CreditCard} label="Active Subscriptions" value={String(m.activeSubscriptions)} />
        <MetricCard icon={TrendingUp} label="Monthly Revenue (MRR)" value={`${CURRENCY}${m.mrr.toLocaleString()}`} />
        <MetricCard icon={DollarSign} label="Total Revenue (ARR)" value={`${CURRENCY}${m.totalRevenue.toLocaleString()}`} />
        <MetricCard icon={Stethoscope} label="Doctors" value={String(m.doctors)} />
        <MetricCard icon={Users} label="System Users" value={String(m.systemUsers)} />
        <MetricCard icon={UserRound} label="Patients" value={String(m.patients)} />
        <MetricCard icon={BedDouble} label="Beds (Capacity)" value={String(m.beds)} />
      </div>

      {/* Subscription Breakdown */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-4">Subscription Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Standard", "Premium", "Enterprise"].map((name) => {
            const t = m.byTier[name] || { count: 0, mrr: 0 };
            return <TierCard key={name} name={name} price={tierPrices[name] || 0} count={t.count} mrr={t.mrr} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default PlatformOverview;
