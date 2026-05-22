import React, { useEffect, useState } from "react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BedDouble, DollarSign, ShieldCheck } from "lucide-react";
import type { SubscriptionTier } from "../../types/tenant";

const MODULE_LABELS: Record<string, string> = {
  emr: "EMR",
  reception: "Reception",
  billing: "Billing",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  hmo_insurance: "HMO Insurance",
  multi_branch: "Multi-Branch",
  human_resources: "HR",
  accounting: "Accounting",
};

const LicensingManager: React.FC = () => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  useEffect(() => {
    adminSupabase.from("subscription_tiers").select("*").then(({ data }) => {
      if (data) setTiers(data.map((d: any) => toCamel(d) as SubscriptionTier));
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Subscription & Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const modules: string[] = tier.allowedModules || [];
          return (
            <Card key={tier.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-white">{tier.name}</CardTitle>
                  <Badge variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/10">
                    ${tier.monthlyPrice}/mo
                  </Badge>
                </div>
                {tier.description && (
                  <p className="text-xs text-slate-400 mt-1">{tier.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Max Staff Seats</p>
                    <p className="text-white font-semibold">{tier.maxStaffSeats >= 99999 ? "Unlimited" : tier.maxStaffSeats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <BedDouble className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Max Bed Capacity</p>
                    <p className="text-white font-semibold">{tier.maxBedCapacity >= 99999 ? "Unlimited" : tier.maxBedCapacity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Monthly Price</p>
                    <p className="text-white font-semibold">${tier.monthlyPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Included Modules</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {modules.length > 0 ? (
                      modules.map((mod) => (
                        <span
                          key={mod}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20"
                        >
                          {MODULE_LABELS[mod] || mod}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No modules defined</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LicensingManager;
