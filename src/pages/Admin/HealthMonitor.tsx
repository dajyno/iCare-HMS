import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Wifi, HardDrive } from "lucide-react";

const statCards = [
  { icon: Activity, label: "System Status", value: "Operational" },
  { icon: Database, label: "Database Storage", value: "12.4 GB / 50 GB" },
  { icon: Wifi, label: "Active Connections", value: "24" },
  { icon: HardDrive, label: "Server Load", value: "14%" },
];

const HealthMonitor: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Infrastructure Health</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-[#0d0d1a] border-[#1a1a35] transition-all duration-300 hover:border-[#0088ff]/30 hover:shadow-[0_0_20px_rgba(0,136,255,0.04)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#8888aa] uppercase tracking-wider">{s.label}</span>
                <div className="w-9 h-9 rounded-lg bg-[#0088ff]/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-[#0088ff]" />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#0d0d1a] border-[#1a1a35]">
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
                    <span className="text-[#8888aa]">{m.label}</span>
                    <span className="text-[#b0b0cc]">{m.value}%</span>
                  </div>
                  <div className="h-2 bg-[#1a1a35] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0088ff] rounded-full transition-all shadow-[0_0_8px_rgba(0,136,255,0.3)]"
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
