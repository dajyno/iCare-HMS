import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { 
  Bed as BedIcon, 
  MapPin, 
  User, 
  Activity,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const InpatientOverview = () => {
  const { data: beds, isLoading } = useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beds")
        .select("*, ward:wards(*), admissions:admissions(*, patient:patients(*))")
        .order("bed_number", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading bed management...</div>;

  const bedsList = Array.isArray(beds) ? beds : [];
  const wards = Array.from(new Set(bedsList.map((b: any) => b.ward.name)));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bed Management</h1>
          <p className="text-sm text-slate-500">Real-time occupancy tracking and admissions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          New Admission
        </Button>
      </div>

      <div className="space-y-8">
        {wards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <BedIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
              {!Array.isArray(beds) ? "Error loading beds" : "No wards found"}
            </h3>
            <p className="text-slate-500">
              {!Array.isArray(beds) ? "Please try refreshing the page." : "Wards will appear here once beds are configured."}
            </p>
          </div>
        ) : (
          wards.map((wardName: any) => (
            <div key={wardName} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                 {wardName}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {bedsList.filter((b: any) => b.ward.name === wardName).map((bed: any) => {
                  const admission = bed.admissions?.[0];
                  const isOccupied = bed.status === "Occupied";

                  return (
                    <Card key={bed.id} className={`border-none shadow-sm ring-1 ring-slate-200 overflow-hidden transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer ${isOccupied ? 'bg-white' : 'bg-slate-50 opacity-80'}`}>
                      <div className={`h-1 w-full ${isOccupied ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <CardHeader className="p-3 pb-1">
                         <div className="flex items-center justify-between">
                           <span className="text-xs font-bold text-slate-400 tracking-wider">BED {bed.bedNumber.split('-').pop()}</span>
                           <Badge variant="outline" className={`text-[10px] h-4 border-none shadow-none font-bold ${isOccupied ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                             {isOccupied ? "OCCUPIED" : "VACANT"}
                           </Badge>
                         </div>
                      </CardHeader>
                      <CardContent className="p-3 space-y-3">
                         {isOccupied ? (
                           <>
                             <div>
                               <p className="text-xs font-bold text-slate-900 truncate">
                                 {admission?.patient?.firstName} {admission?.patient?.lastName}
                               </p>
                               <p className="text-[10px] text-slate-500">{admission?.patient?.patientId}</p>
                             </div>
                             <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                <Activity className="w-3 h-3 text-red-500 animate-pulse" />
                                <span className="text-[10px] text-slate-500 font-medium">Critical care status</span>
                             </div>
                           </>
                         ) : (
                           <div className="flex items-center justify-center py-6 text-slate-300">
                             <BedIcon className="w-6 h-6 opacity-30" />
                           </div>
                         )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InpatientOverview;
