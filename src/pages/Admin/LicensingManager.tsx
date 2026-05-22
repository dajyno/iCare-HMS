import React, { useEffect, useState } from "react";
import { supabase, toCamel } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BedDouble, DollarSign } from "lucide-react";
import type { SubscriptionTier } from "../../types/tenant";

const LicensingManager: React.FC = () => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  useEffect(() => {
    supabase.from("subscription_tiers").select("*").then(({ data }) => {
      if (data) setTiers(data.map((d: any) => toCamel(d) as SubscriptionTier));
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Subscription & Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
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
                  <p className="text-slate-400 text-xs">Max Doctor Seats</p>
                  <p className="text-white font-semibold">{tier.maxDoctorSeats === 999 ? "Unlimited" : tier.maxDoctorSeats}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <BedDouble className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Max Bed Capacity</p>
                  <p className="text-white font-semibold">{tier.maxBedCapacity === 500 ? "Unlimited" : tier.maxBedCapacity}</p>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LicensingManager;
