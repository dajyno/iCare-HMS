import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminSupabase } from "../../lib/adminSupabase";
import { Building2, Activity, Clock, ShieldAlert, Loader2 } from "lucide-react";

interface HealthData {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalPatients: number;
  tierDistribution: { tier: string; count: number; pct: number }[];
}

const initialData: HealthData = {
  totalTenants: 0,
  activeTenants: 0,
  trialTenants: 0,
  suspendedTenants: 0,
  totalUsers: 0,
  totalPatients: 0,
  tierDistribution: [],
};

const HealthMonitor: React.FC = () => {
  const [data, setData] = useState<HealthData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      const { data: tenants } = await adminSupabase
        .from("tenants")
        .select("status, tier");
      const { count: userCount } = await adminSupabase
        .from("users")
        .select("*", { count: "exact", head: true });
      const { count: patientCount } = await adminSupabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      const all = tenants || [];
      const total = all.length;
      const active = all.filter((t: any) => t.status === "Active").length;
      const trial = all.filter((t: any) => t.status === "Trial").length;
      const suspended = all.filter((t: any) => t.status === "Suspended").length;

      const tierGroups: Record<string, number> = {};
      all.forEach((t: any) => {
        const key = t.tier || "Unknown";
        tierGroups[key] = (tierGroups[key] || 0) + 1;
      });
      const tierDistribution = Object.entries(tierGroups)
        .map(([tier, count]) => ({ tier, count, pct: total ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      setData({
        totalTenants: total,
        activeTenants: active,
        trialTenants: trial,
        suspendedTenants: suspended,
        totalUsers: userCount || 0,
        totalPatients: patientCount || 0,
        tierDistribution,
      });
      setLoading(false);
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { icon: Building2, label: "Total Tenants", value: data.totalTenants.toLocaleString(), color: "#0088ff" },
    { icon: Activity, label: "Active Tenants", value: data.activeTenants.toLocaleString(), color: "#10b981" },
    { icon: Clock, label: "Trial Tenants", value: data.trialTenants.toLocaleString(), color: "#f59e0b" },
    { icon: ShieldAlert, label: "Suspended Tenants", value: data.suspendedTenants.toLocaleString(), color: "#ef4444" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#0088ff] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Platform Health</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-[#0d0d1a] border-[#1a1a35] transition-all duration-300 hover:border-[#0088ff]/30 hover:shadow-[0_0_20px_rgba(0,136,255,0.04)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#8888aa] uppercase tracking-wider">{s.label}</span>
                <div className="w-9 h-9 rounded-lg bg-[#0088ff]/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0d0d1a] border-[#1a1a35]">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white">Tenant Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Active", value: data.activeTenants, max: data.totalTenants || 1, color: "#10b981" },
                { label: "Trial", value: data.trialTenants, max: data.totalTenants || 1, color: "#f59e0b" },
                { label: "Suspended", value: data.suspendedTenants, max: data.totalTenants || 1, color: "#ef4444" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8888aa]">{m.label}</span>
                    <span className="text-[#b0b0cc]">{m.value}</span>
                  </div>
                  <div className="h-2 bg-[#1a1a35] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all shadow-[0_0_8px_rgba(0,136,255,0.3)]"
                      style={{ width: `${(m.value / m.max) * 100}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0d0d1a] border-[#1a1a35]">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white">Subscription Tier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.tierDistribution.map((t) => (
                <div key={t.tier}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8888aa]">{t.tier}</span>
                    <span className="text-[#b0b0cc]">{t.count} ({t.pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#1a1a35] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all shadow-[0_0_8px_rgba(0,136,255,0.3)]"
                      style={{ width: `${t.pct}%`, backgroundColor: "#0088ff" }}
                    />
                  </div>
                </div>
              ))}
              {data.tierDistribution.length === 0 && (
                <p className="text-xs text-[#8888aa]">No tenant data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.totalTenants > 0 && (
        <Card className="bg-[#0d0d1a] border-[#1a1a35] mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white">Aggregate User & Patient Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-16 py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{data.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-[#8888aa] mt-1">Total Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{data.totalPatients.toLocaleString()}</p>
                <p className="text-xs text-[#8888aa] mt-1">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HealthMonitor;
