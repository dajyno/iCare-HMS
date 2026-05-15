import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { Plus, Beaker } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";

const NewExamDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [patientId, setPatientId] = useState("");
  const [testId, setTestId] = useState("");
  const [open, setOpen] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, patient_id")
        .eq("status", "active")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: labTests } = useQuery({
    queryKey: ["lab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("id, name, price, category")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lab_requests").insert({
        patient_id: patientId,
        test_id: testId,
        status: "Requested",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPatientId("");
      setTestId("");
      setOpen(false);
      onCreated();
    },
  });

  const isValid = patientId && testId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-4 gap-2 font-semibold text-xs" />}>
        <Plus className="w-3.5 h-3.5" />
        New Exam
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            New Laboratory Request
          </DialogTitle>
          <DialogDescription>
            Select a patient and the test to request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Patient
            </Label>
            <SearchableSelect
              value={patientId}
              onValueChange={setPatientId}
              placeholder="Search patient..."
              options={(Array.isArray(patients) ? patients : []).map(
                (p: any) => ({
                  value: p.id,
                  label: `${p.firstName} ${p.lastName} (${p.patientId})`,
                })
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Test
            </Label>
            <SearchableSelect
              value={testId}
              onValueChange={setTestId}
              placeholder="Select test..."
              options={(Array.isArray(labTests) ? labTests : []).map(
                (t: any) => ({
                  value: t.id,
                  label: `${t.name} — ₦${t.price?.toFixed(2)}`,
                })
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Cancel
          </DialogClose>
          <Button
            size="sm"
            className="bg-[#005EB8] hover:bg-[#004d9a] text-white"
            disabled={!isValid || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewExamDialog;
