import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { 
  Pill, 
  Search, 
  Clock, 
  CheckCircle2,
  Package,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PharmacyQueue = () => {
  const queryClient = useQueryClient();
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patient:patients(*), doctor:users(*), items:prescription_items(*, medication:medications(*))")
        .order("date", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const dispenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      for (const item of payload.items) {
        await supabase.rpc("decrement_stock", {
          med_id: item.medicationId,
          qty: item.quantity,
        });
      }
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: "Dispensed" })
        .eq("id", payload.prescriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    }
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading prescriptions...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Queue</h1>
          <p className="text-sm text-slate-500">Dispense medications from doctor prescriptions</p>
        </div>
      </div>

      <div className="grid gap-6">
        {!Array.isArray(prescriptions) || prescriptions.length === 0 ? (
          <div className="py-20 text-center bg-white border rounded-xl border-dashed">
            <Pill className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">
              {!Array.isArray(prescriptions) ? "Error loading prescriptions" : "No pending prescriptions"}
            </p>
          </div>
        ) : (
          prescriptions.map((pres: any) => (
            <Card key={pres.id} className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
               <CardHeader className="bg-slate-50/50 border-b py-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                         {pres.patient.firstName[0]}{pres.patient.lastName[0]}
                       </div>
                       <div>
                         <CardTitle className="text-lg">{pres.patient.firstName} {pres.patient.lastName}</CardTitle>
                         <CardDescription>Prescribed by Dr. {pres.doctor.fullName} • {format(new Date(pres.date), "MMM dd, yyyy")}</CardDescription>
                       </div>
                    </div>
                    <Badge className={pres.status === 'Dispensed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                      {pres.status}
                    </Badge>
                 </div>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="p-4 space-y-4">
                   <div className="bg-slate-50 rounded-lg p-3">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medications</h4>
                     <div className="space-y-2">
                       {pres.items.map((item: any, i: number) => (
                         <div key={i} className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-2">
                             <Pill className="w-3 h-3 text-blue-600" />
                             <span className="font-semibold text-slate-900">{item.medication.name}</span>
                             <span className="text-slate-500 text-xs">{item.dosage}</span>
                           </div>
                           <span className="text-slate-500 font-medium italic">{item.frequency} for {item.duration}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   {pres.status !== 'Dispensed' && (
                     <div className="flex justify-end pt-2">
                       <Button 
                        className="bg-blue-600 hover:bg-blue-700 font-bold px-8"
                        onClick={() => dispenseMutation.mutate({ 
                          prescriptionId: pres.id, 
                          items: pres.items.map((i: any) => ({ medicationId: i.medicationId, quantity: 1 })) 
                        })}
                        disabled={dispenseMutation.isPending}
                       >
                         {dispenseMutation.isPending ? "Dispensing..." : "Confirm & Dispense"}
                       </Button>
                     </div>
                   )}
                 </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PharmacyQueue;
