import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AppointmentList = () => {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient:patients(*), doctor:users(*)")
        .order("date", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading appointments...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Cancelled": return "bg-rose-50 text-rose-700 border-rose-100";
      case "Waiting": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">View and manage clinical appointments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      <div className="grid gap-4">
        {!Array.isArray(appointments) || appointments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
              {!Array.isArray(appointments) ? "Error loading appointments" : "No appointments found"}
            </h3>
            <p className="text-slate-500">
              {!Array.isArray(appointments) ? "Please try refreshing the page." : "Try adjusting filters or book a new one."}
            </p>
          </div>
        ) : (
          appointments.map((apt: any) => (
            <Card key={apt.id} className="border-none shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 transition-all cursor-pointer group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl flex flex-col items-center justify-center min-w-[64px]">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{format(new Date(apt.date), "MMM")}</span>
                      <span className="text-xl font-extrabold text-slate-900">{format(new Date(apt.date), "dd")}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{apt.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          <span>Dr. {apt.doctor.fullName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge variant="outline" className={getStatusColor(apt.status)}>
                      {apt.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 transition-colors hover:text-slate-900">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
