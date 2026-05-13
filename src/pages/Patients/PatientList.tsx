import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical,
  User,
  Phone,
  Mail,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PatientList = () => {
  const { data: patients, isLoading, isError, error } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("registration_date", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-400 font-medium">Accessing patient records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-slate-50 border rounded-xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-blue-500 opacity-20 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Unable to load patients</h3>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {error instanceof Error ? error.message : "The server encountered an error while fetching the patient list."}
        </p>
        <Button onClick={() => window.location.reload()} className="bg-blue-600">
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patients</h1>
          <p className="text-slate-500 text-sm">Manage and register hospital patients</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by ID, name, or phone..." 
              className="pl-9 bg-white max-w-md h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left">Patient Details</th>
                <th className="px-6 py-3 text-left">Contact Info</th>
                <th className="px-6 py-3 text-left">Blood Group</th>
                <th className="px-6 py-3 text-left">Registration</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.isArray(patients) ? (
                patients.map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-xs font-mono text-slate-500 uppercase tracking-tighter">
                            {patient.patientId} • {patient.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 opacity-40" />
                          <span className="text-xs">{patient.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 opacity-40" />
                          <span className="text-xs">{patient.email || "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 font-bold">
                        {patient.bloodGroup || "UKN"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {patient.registrationDate ? new Date(patient.registrationDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 font-sans">
                          <DropdownMenuItem className="cursor-pointer">View Profile</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">Edit Details</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">Book Appointment</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-red-600">Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {patients ? "Unexpected data format received from server." : "No patients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientList;
