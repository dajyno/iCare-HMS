import { Wallet, CreditCard, Banknote, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RevenueSummary } from "../types";

interface RevenueKPICardsProps {
  data: RevenueSummary | undefined;
  loading: boolean;
}

function KpiSkeleton() {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RevenueKPICards({ data, loading }: RevenueKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Gross Collected</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                ₦{data?.totalGrossCollected.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank / POS Channels</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                ₦{data?.digitalChannelTotal.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cash-at-Hand Summary</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                ₦{data?.cashAtHand.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HMO / Insurance</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                ₦{data?.hmoTotal.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
