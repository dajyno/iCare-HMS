import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { 
  FlaskConical, 
  Search, 
  Clock, 
  FlaskRound as Flask,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const LabQueue = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["lab-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, patient:patients(*), test:lab_tests(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: req } = await supabase
        .from("lab_requests")
        .select("patient_id")
        .eq("id", requestId)
        .single();
      const { error } = await supabase
        .from("lab_results")
        .insert({
          request_id: requestId,
          patient_id: req?.patient_id,
          result_value: "Normal",
          interpretation: "Tested and verified",
          technician_id: user?.id,
        });
      if (error) throw error;
      await supabase
        .from("lab_requests")
        .update({ status: "Completed" })
        .eq("id", requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    }
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading lab queue...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratory Queue</h1>
          <p className="text-sm text-slate-500">Process pending test requests and record results</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {!Array.isArray(requests) || requests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border rounded-xl border-dashed">
            <Flask className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">
              {!Array.isArray(requests) ? "Error loading lab requests" : "No pending lab requests"}
            </p>
          </div>
        ) : (
          requests.map((req: any) => (
            <Card key={req.id} className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
               <div className={`h-1.5 w-full ${req.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-slate-100 border-none font-mono text-[10px]">
                      REQ-{req.id.slice(-6).toUpperCase()}
                    </Badge>
                    <Badge className={req.status === 'Completed' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                      {req.status}
                    </Badge>
                 </div>
                 <CardTitle className="text-lg font-bold mt-2">{req.test.name}</CardTitle>
                 <CardDescription className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{req.patient.firstName} {req.patient.lastName}</span>
                    <span>•</span>
                    <span>{req.patient.gender}</span>
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3" /> {req.test.sampleType || "Blood"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(req.createdAt), "HH:mm, MMM dd")}</span>
                 </div>
                 
                 {req.status !== 'Completed' && (
                   <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-9 font-semibold"
                    onClick={() => completeMutation.mutate(req.id)}
                    disabled={completeMutation.isPending}
                   >
                     {completeMutation.isPending ? "Processing..." : "Mark as Collected & Process"}
                   </Button>
                 )}
               </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LabQueue;
