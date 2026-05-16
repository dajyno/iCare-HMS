import { BarChart3, TrendingUp, DollarSign, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsBoard from "./AnalyticsBoard";
import { useAnalyticsData } from "../hooks";

const BillingAnalytics = () => {
  const analytics = useAnalyticsData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-100">
          <BarChart3 className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-xs text-slate-500">Revenue performance and drug demand insights</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              ₦{analytics.totalRevenue.toLocaleString()}
            </div>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {analytics.totalPrescriptions.toLocaleString()}
            </div>
            <Receipt className="w-5 h-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              ₦{analytics.avgOrderValue.toFixed(2)}
            </div>
            <TrendingUp className="w-5 h-5 text-sky-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Drugs</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {analytics.topDrugs.length}
            </div>
            <BarChart3 className="w-5 h-5 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <AnalyticsBoard />
    </div>
  );
};

export default BillingAnalytics;
