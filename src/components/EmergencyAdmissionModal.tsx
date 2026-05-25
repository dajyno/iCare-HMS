import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Search,
  User,
  Bed,
  ClipboardList,
  Check,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";

interface EmergencyAdmissionModalProps {
  open: boolean;
  onClose: () => void;
}

interface PatientResult {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface WardConfig {
  wardId: string;
  name: string;
  department: string;
  totalBeds: number;
  beds: BedUnit[];
}

interface BedUnit {
  bedCode: string;
  status: string;
}

const EmergencyAdmissionModal = ({ open, onClose }: EmergencyAdmissionModalProps) => {
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [wards, setWards] = useState<WardConfig[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [selectedBedCode, setSelectedBedCode] = useState("");
  const [doctors, setDoctors] = useState<string[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: wardData }, { data: userData }] = await Promise.all([
        (supabase as any).from("wards").select("id, name, type, beds_count, beds(id, bed_number, status), department:departments(name)").order("name", { ascending: true }),
        (supabase as any).from("users").select("full_name").eq("role", "Doctor"),
      ]);
      if (wardData) {
        const grouped: WardConfig[] = wardData.map((w: any) => ({
          wardId: w.id,
          name: w.name,
          department: w.department?.name ?? "General",
          totalBeds: w.beds_count,
          beds: (w.beds || []).map((b: any) => ({
            bedCode: `${w.name}-${b.bed_number}`,
            status: b.status,
          })),
        }));
        setWards(grouped);
      }
      if (userData) {
        setDoctors(userData.map((d: any) => d.full_name));
      }
    })();
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || selectedPatient) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await (supabase as any)
          .from("patients")
          .select("id, patient_id, first_name, last_name, phone")
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(8);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedPatient]);

  const departments = Array.from(new Set(wards.map((w) => w.department))).sort();
  const filteredWards = wards.filter((w) => w.department === selectedDepartment);
  const selectedWard = wards.find((w) => w.wardId === selectedWardId);
  const availableBeds = selectedWard?.beds.filter((b) => b.status === "Available") || [];

  const canProceedStep0 = !!selectedPatient;
  const canProceedStep1 = !!selectedDepartment && !!selectedWardId && !!selectedBedCode;
  const canSubmit = diagnosis.trim() && selectedDoctor;

  const handleClose = () => {
    setStep(0);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPatient(null);
    setSelectedDepartment("");
    setSelectedWardId("");
    setSelectedBedCode("");
    setSelectedDoctor("");
    setDiagnosis("");
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPatient || !selectedWardId || !selectedBedCode) return;
    setSubmitting(true);
    try {
      const bedNumber = selectedBedCode.split("-").pop() || "";
      const { data: bedRow } = await (supabase as any)
        .from("beds")
        .select("id")
        .eq("ward_id", selectedWardId)
        .eq("bed_number", bedNumber)
        .maybeSingle();
      if (bedRow) {
        await (supabase as any).from("admissions").insert({
          patient_id: selectedPatient.id,
          ward_id: selectedWardId,
          bed_id: bedRow.id,
          admitting_doctor_id: selectedDoctor,
          diagnosis,
          notes: "Emergency admission",
          status: "Admitted",
        });
        await (supabase as any).from("beds").update({ status: "Occupied" }).eq("id", bedRow.id);
      }
      handleClose();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">+ Emergency Admission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 0 && "Find patient profile"}
              {step === 1 && "Allocate ward & bed"}
              {step === 2 && "Clinical details"}
            </p>
          </div>
          <button onClick={handleClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 min-h-[300px]">
          {step === 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-slate-700">Search Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedPatient(null); }}
                  placeholder="Type name, ID, or phone..."
                  className="h-10 pl-9"
                />
                {searchQuery.trim() && !selectedPatient && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {searching ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-sm text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-400">No matching patients</div>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setSearchQuery(`${p.first_name} ${p.last_name} (${p.patient_id})`); setSearchResults([]); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {p.first_name[0]}{p.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.patient_id}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Selected: <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
                  </span>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button disabled={!canProceedStep0} onClick={() => setStep(1)} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {wards.length === 0 ? (
                <div className="py-12 text-center">
                  <Bed className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                  <p className="text-sm text-slate-500">No wards configured yet.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Department</Label>
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedWardId(""); setSelectedBedCode(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedDepartment && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Ward</Label>
                      <Select value={selectedWardId} onValueChange={(v) => { setSelectedWardId(v); setSelectedBedCode(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select ward..." /></SelectTrigger>
                        <SelectContent>
                          {filteredWards.map((w) => (
                            <SelectItem key={w.wardId} value={w.wardId}>{w.name} ({w.totalBeds} beds)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedWardId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-slate-700">Select Bed</Label>
                        <span className="text-xs text-slate-400">{availableBeds.length} available</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                        {selectedWard?.beds.map((bed) => {
                          const isAvailable = bed.status === "Available";
                          const isSelected = selectedBedCode === bed.bedCode;
                          return (
                            <button
                              key={bed.bedCode}
                              disabled={!isAvailable}
                              onClick={() => isAvailable && setSelectedBedCode(bed.bedCode)}
                              className={cn(
                                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-xs font-bold transition-all",
                                isSelected
                                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                                  : isAvailable
                                  ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                                  : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                              )}
                            >
                              <Bed className="h-3.5 w-3.5" />
                              <span className="mt-0.5 text-[9px] leading-tight">{bed.bedCode.split("-").pop()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button disabled={!canProceedStep1} onClick={() => setStep(2)} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Provisional Diagnosis</Label>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Enter initial diagnosis..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Attending Physician</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger><SelectValue placeholder="Assign physician..." /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((doc) => (
                      <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Check className="h-4 w-4" /> Admit Emergency Patient</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyAdmissionModal;
