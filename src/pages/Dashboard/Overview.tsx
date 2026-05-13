import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Calendar, 
  FlaskConical, 
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Overview = () => {
  const { data: stats, isLoading, error: queryError, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [patientCount, appointmentCount, pendingLabs, revenue] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .gte("date", today.toISOString())
          .lt("date", tomorrow.toISOString()),
        supabase.from("lab_requests").select("*", { count: "exact", head: true })
          .neq("status", "Completed"),
        supabase.from("payments").select("amount")
          .gte("date", today.toISOString())
          .lt("date", tomorrow.toISOString()),
      ]);

      const revenueToday = revenue.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      return {
        totalPatients: patientCount.count || 0,
        appointmentsToday: appointmentCount.count || 0,
        pendingLabs: pendingLabs.count || 0,
        revenueToday,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm font-medium">Crunching hospital data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold text-red-900">Dashboard failed to load</h3>
          <p className="text-sm mt-1">There was an error fetching the latest stats. Please try refreshing or contact system support.</p>
          <pre className="mt-3 p-3 bg-red-100/50 rounded text-[10px] font-mono overflow-auto max-w-full">
            {queryError instanceof Error ? queryError.message : JSON.stringify(queryError)}
          </pre>
          <Button 
            variant="outline" 
            className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Patients", value: stats?.totalPatients || 0, icon: Users, color: "text-sky-600", bg: "bg-sky-50", trend: "12% from last month" },
    { label: "Appointments Today", value: stats?.appointmentsToday || 0, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", trend: "6 slots remaining" },
    { label: "Pending Labs", value: stats?.pendingLabs || 0, icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50", trend: "Awaiting results" },
    { label: "Daily Revenue", value: `$${stats?.revenueToday?.toLocaleString() || 0}`, icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50", trend: "Verified by Finance" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Hospital Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back. Here's what's happening across departments today.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className={cn(
                "text-[10px] font-medium",
                card.color.replace('text-', 'text-opacity-80 text-')
              )}>
                {card.trend}
              </span>
              <div className={cn("p-1.5 rounded-lg", card.bg, card.color)}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
            <h3 className="font-bold text-slate-800">Upcoming Consultations</h3>
            <Button variant="ghost" className="text-xs font-semibold text-sky-600 hover:bg-sky-50 h-8">View All</Button>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Patient</th>
                  <th className="px-6 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {[
                  { name: "Elena Rodriguez", id: "#PT-8832", status: "Waiting", color: "bg-amber-50 text-amber-600" },
                  { name: "Marcus Chen", id: "#PT-9102", status: "In Progress", color: "bg-sky-50 text-sky-600" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-slate-400">ID: {row.id}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn("px-2 py-1 text-[10px] font-bold rounded uppercase", row.color)}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-800">Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3">
                <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-red-900">Inventory Alert: Amoxicillin</p>
                  <p className="text-[10px] text-red-700">Stock level below 15% in Main Pharmacy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-sky-600 rounded-xl shadow-sm p-6 text-white">
            <h3 className="font-bold mb-2">Emergency Registration</h3>
            <p className="text-xs text-sky-100 mb-4 opacity-90 leading-relaxed">Quickly admit an emergency patient with minimal data entry.</p>
            <Button className="w-full bg-white text-sky-600 font-bold hover:bg-sky-50 h-10 border-none shadow-none">
              Admit Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
