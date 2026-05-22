import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Wifi, HardDrive } from "lucide-react";

const statCards = [
  {
    icon: Activity,
    label: "System Status",
    value: "Operational",
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
  },
  {
    icon: Database,
    label: "Database Storage",
    value: "12.4 GB / 50 GB",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  {
    icon: Wifi,
    label: "Active Connections",
    value: "24",
    color: "text-violet-400",
    bg: "bg-violet-500/20",
  },
  {
    icon: HardDrive,
    label: "Server Load",
    value: "14%",
    color: "text-amber-400",
    bg: "bg-amber-500/20",
  },
];

const HealthMonitor: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Infrastructure Health</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</span>
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-white">System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "CPU Usage", value: 23, max: 100 },
              { label: "Memory Usage", value: 45, max: 100 },
              { label: "Disk I/O", value: 12, max: 100 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{m.label}</span>
                  <span className="text-slate-300">{m.value}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthMonitor;
