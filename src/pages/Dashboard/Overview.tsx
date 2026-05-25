import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import { useGlobalSettings } from "@/src/context/GlobalSettingsContext";
import {
  Users,
  ClipboardList,
  FlaskConical,
  Scan,
  Pill,
  Bed,
  CreditCard,
  Calculator,
  UserPlus,
  BarChart3,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import EmergencyAdmissionModal from "@/src/components/EmergencyAdmissionModal";

interface DashboardStats {
  totalPatients: number;
  consultationsToday: number;
  pendingLabs: number;
  pendingScans: number;
  pendingRx: number;
  bedOccupancy: number;
  dailyRevenue: number;
  outstandingClaims: number;
  activeStaff: number;
}

interface AppointmentRow {
  id: string;
  start_time: string;
  status: string;
  patients: { first_name: string; last_name: string } | null;
}

async function fetchStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    { count: totalPatients },
    { count: consultationsToday },
    { count: pendingLabs },
    { count: pendingScans },
    { count: pendingRx },
    { data: beds },
    { data: payments },
    { count: unpaidInvoices },
    { count: activeStaff },
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("consultations").select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
    supabase.from("lab_requests").select("*", { count: "exact", head: true })
      .neq("status", "Completed"),
    supabase.from("radiology_requests").select("*", { count: "exact", head: true })
      .neq("status", "Completed"),
    supabase.from("prescriptions").select("*", { count: "exact", head: true })
      .eq("status", "Paid"),
    supabase.from("beds").select("status"),
    supabase.from("payments").select("amount")
      .gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
    supabase.from("invoices").select("*", { count: "exact", head: true })
      .neq("status", "Paid"),
    (adminSupabase as any).from("staff").select("*", { count: "exact", head: true }),
  ]);

  const occupiedBeds = (beds || []).filter((b: any) => b.status === "Occupied").length;
  const totalBeds = beds?.length || 1;

  return {
    totalPatients: totalPatients || 0,
    consultationsToday: consultationsToday || 0,
    pendingLabs: pendingLabs || 0,
    pendingScans: pendingScans || 0,
    pendingRx: pendingRx || 0,
    bedOccupancy: Math.round((occupiedBeds / totalBeds) * 100),
    dailyRevenue: (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
    outstandingClaims: unpaidInvoices || 0,
    activeStaff: activeStaff || 0,
  };
}

async function fetchUpcomingAppointments(): Promise<AppointmentRow[]> {
  const { data } = await supabase
    .from("appointments")
    .select("id, start_time, status, patients(id, first_name, last_name)")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);
  return (data || []) as AppointmentRow[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "Confirmed": return "text-blue-600 bg-blue-50";
    case "Waiting": return "text-amber-600 bg-amber-50";
    case "Ongoing": return "text-emerald-600 bg-emerald-50";
    case "Completed": return "text-slate-500 bg-slate-100";
    case "Cancelled": return "text-red-600 bg-red-50";
    default: return "text-slate-500 bg-slate-100";
  }
};

const ModuleCard = ({
  icon: Icon,
  label,
  metric,
  href,
  color,
  bg,
  onClick,
}: {
  icon: any;
  label: string;
  metric: string;
  href: string;
  color: string;
  bg: string;
  onClick: (href: string) => void;
  key?: string;
}) => (
  <button
    onClick={() => onClick(href)}
    className="group relative flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 hover:bg-blue-50/30"
  >
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="text-xs text-slate-500">{metric}</span>
    </div>
  </button>
);

const Overview = () => {
  const { settings } = useGlobalSettings();
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const p = (path: string) => hospital_slug ? `/${hospital_slug}${path}` : path;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [admitModalOpen, setAdmitModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats, isLoading, error: queryError, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  const { data: appointments } = useQuery({
    queryKey: ["upcoming-appointments"],
    queryFn: fetchUpcomingAppointments,
    refetchInterval: 15000,
  });

  const handleNav = (href: string) => navigate(p(href));

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading hospital dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">Dashboard failed to load</h3>
            <p className="mt-1 text-sm text-red-700">
              There was an error fetching the latest stats. Please refresh or contact support.
            </p>
            <pre className="mt-3 max-w-full overflow-auto rounded bg-red-100/50 p-3 text-[10px] font-mono">
              {queryError instanceof Error ? queryError.message : JSON.stringify(queryError)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const modules = [
    { icon: Users, label: "Patients", metric: `${stats?.totalPatients.toLocaleString()} registered`, href: "/patients", color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: ClipboardList, label: "Consultations", metric: `${stats?.consultationsToday} new today`, href: "/consultations", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: FlaskConical, label: "Laboratory", metric: `${stats?.pendingLabs} pending`, href: "/laboratory", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Scan, label: "Radiology", metric: `${stats?.pendingScans} pending`, href: "/radiology", color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Pill, label: "Pharmacy", metric: `${stats?.pendingRx} pending`, href: "/pharmacy/prescriptions", color: "text-rose-600", bg: "bg-rose-50" },
    { icon: Bed, label: "Inpatient", metric: `${stats?.bedOccupancy}% occupied`, href: "/inpatient", color: "text-cyan-600", bg: "bg-cyan-50" },
    { icon: CreditCard, label: "Billing", metric: `₦${(stats?.dailyRevenue ?? 0).toLocaleString()} total`, href: "/billing", color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: Calculator, label: "Accounting", metric: `${stats?.outstandingClaims} claims`, href: "/accounting", color: "text-teal-600", bg: "bg-teal-50" },
    { icon: UserPlus, label: "Staff", metric: `${stats?.activeStaff} registered`, href: "/staff", color: "text-orange-600", bg: "bg-orange-50" },
    { icon: BarChart3, label: "Reports", metric: "Analytics & KPIs", href: "/reports", color: "text-slate-600", bg: "bg-slate-100" },
  ];

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {settings.hospitalName || "iCare Medical Center"}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            <span>{settings.hospitalAddress || "123 Healthcare Avenue, Medical District"}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm sm:mt-0">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-medium">{timeStr}</span>
          </div>
        </div>
      </div>

      {/* Main grid: 75% workspace + 25% sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main workspace — module cards */}
        <div className="flex-1 lg:w-3/4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {modules.map((m) => (
              <ModuleCard key={m.label} icon={m.icon} label={m.label} metric={m.metric} href={m.href} color={m.color} bg={m.bg} onClick={handleNav} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:w-1/4 lg:min-w-[280px]">
          {/* Pending Appointments */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-800">Pending Appointments</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments && appointments.length > 0 ? (
                appointments.map((apt) => {
                  const time = new Date(apt.start_time);
                  const timeLabel = time.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const patientName = apt.patients
                    ? `${apt.patients.first_name} ${apt.patients.last_name}`
                    : "Unknown Patient";
                  return (
                    <div key={apt.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{patientName}</p>
                        <p className="text-xs text-slate-400">{timeLabel}</p>
                      </div>
                      <span
                        className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor(apt.status)}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  No upcoming appointments
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-4 py-2.5">
              <button
                onClick={() => handleNav("/appointments")}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                View More
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Emergency Registration */}
          <div className="rounded-xl bg-blue-600 p-5 shadow-sm">
            <h3 className="text-base font-bold text-white">Emergency Registration</h3>
            <p className="mt-1 text-xs leading-relaxed text-blue-100">
              Quickly admit an emergency patient with minimal data entry.
            </p>
            <button
              onClick={() => setAdmitModalOpen(true)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-4 text-sm font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-50"
            >
              Admit Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <EmergencyAdmissionModal
        open={admitModalOpen}
        onClose={() => setAdmitModalOpen(false)}
      />
    </div>
  );
};

export default Overview;
