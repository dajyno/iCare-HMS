import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Search, Pill, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/src/lib/supabase";

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
import { useAuth } from "@/src/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface PrescriptionLineItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
}

const ROUTES = ["Oral", "IV", "IM", "Subcutaneous", "Topical", "Inhalation", "Ophthalmic", "Otic", "Rectal", "Sublingual"];

const NewPrescriptionDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<PrescriptionLineItem[]>([
    { medicationId: "", medicationName: "", dosage: "", frequency: "", duration: "", route: "Oral", quantity: 1 },
  ]);
  const [medSearch, setMedSearch] = useState<Record<number, string>>({});
  const [medResults, setMedResults] = useState<Record<number, any[]>>({});
  const searchTimeout = useRef<any>(null);
  const medTimeouts = useRef<Record<number, any>>({});

  const createPrescription = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("Please select a patient");
      if (items.some((i) => !i.medicationId || !i.dosage || !i.frequency || !i.duration)) {
        throw new Error("Please fill in all medication fields");
      }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("No auth session");

      const res = await fetch(`${SUPABASE_URL}/rest/v1/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          doctor_id: user?.id || "00000000-0000-0000-0000-000000000000",
          status: "Pending",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }
      const created = await res.json();
      const prescriptionId = Array.isArray(created) ? created[0]?.id : created?.id;
      if (!prescriptionId) throw new Error("No prescription ID returned");

      const itemsPayload = items.filter((i) => i.medicationId).map((item) => ({
        prescription_id: prescriptionId,
        medication_id: item.medicationId,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.route,
      }));

      const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/prescription_items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(itemsPayload),
      });
      if (!itemsRes.ok) {
        const text = await itemsRes.text();
        throw new Error(`Failed to add items: ${text}`);
      }

      return prescriptionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
      resetForm();
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setPatientQuery("");
    setPatientResults([]);
    setSelectedPatient(null);
    setItems([{ medicationId: "", medicationName: "", dosage: "", frequency: "", duration: "", route: "Oral", quantity: 1 }]);
    setMedSearch({});
    setMedResults({});
  };

  const searchPatients = useCallback(async (q: string) => {
    if (!q.trim()) { setPatientResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name, date_of_birth")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,patient_id.ilike.%${q}%`)
        .limit(8);
      setPatientResults(data || []);
    } catch { setPatientResults([]); }
    finally { setSearching(false); }
  }, []);

  const searchMedications = useCallback(async (q: string, idx: number) => {
    if (!q.trim()) { setMedResults((prev) => ({ ...prev, [idx]: [] })); return; }
    try {
      const { data } = await supabase
        .from("medications")
        .select("id, name, dosage_form, strength, unit_price")
        .ilike("name", `%${q}%`)
        .limit(6);
      setMedResults((prev) => ({ ...prev, [idx]: data || [] }));
    } catch { setMedResults((prev) => ({ ...prev, [idx]: [] })); }
  }, []);

  const handlePatientInput = (q: string) => {
    setPatientQuery(q);
    setSelectedPatient(null);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPatients(q), 250);
  };

  const handleMedInput = (q: string, idx: number) => {
    setMedSearch((prev) => ({ ...prev, [idx]: q }));
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, medicationId: "", medicationName: "" } : it));
    clearTimeout(medTimeouts.current[idx]);
    medTimeouts.current[idx] = setTimeout(() => searchMedications(q, idx), 250);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { medicationId: "", medicationName: "", dosage: "", frequency: "", duration: "", route: "Oral", quantity: 1 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PrescriptionLineItem, value: any) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Prescription</DialogTitle>
          <DialogDescription>Create a new prescription for a patient.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600">Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} (${selectedPatient.patient_id})` : patientQuery}
                onChange={(e) => handlePatientInput(e.target.value)}
                placeholder="Search patient by name or ID..."
                className="pl-9 h-9 text-sm"
                disabled={!!selectedPatient}
              />
              {selectedPatient && (
                <button
                  onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!selectedPatient && patientResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50 flex items-center justify-between"
                    onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientQuery(""); }}
                  >
                    <span className="font-medium text-slate-900">{p.first_name} {p.last_name}</span>
                    <span className="text-xs font-mono text-slate-400">{p.patient_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-600">Medications</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-sky-600" onClick={addItem}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>

            <AnimatePresence>
              {items.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      value={item.medicationName || medSearch[idx] || ""}
                      onChange={(e) => handleMedInput(e.target.value, idx)}
                      placeholder="Search medication..."
                      className="pl-9 h-9 text-sm"
                    />
                    {medResults[idx] && medResults[idx].length > 0 && !item.medicationId && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-lg">
                        {medResults[idx].map((med: any) => (
                          <button
                            key={med.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50 flex items-center justify-between"
                            onClick={() => {
                              updateItem(idx, "medicationId", med.id);
                              updateItem(idx, "medicationName", med.name);
                              setMedSearch((prev) => ({ ...prev, [idx]: "" }));
                              setMedResults((prev) => ({ ...prev, [idx]: [] }));
                            }}
                          >
                            <div>
                              <span className="font-medium text-slate-900">{med.name}</span>
                              {med.strength && <span className="text-[11px] text-slate-400 ml-1">{med.strength}</span>}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">₦{med.unit_price?.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {item.medicationId && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5">
                      <Check className="w-3 h-3" />
                      {item.medicationName}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Dosage</Label>
                      <Input value={item.dosage} onChange={(e) => updateItem(idx, "dosage", e.target.value)} placeholder="e.g. 2 tablets" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Frequency</Label>
                      <Input value={item.frequency} onChange={(e) => updateItem(idx, "frequency", e.target.value)} placeholder="e.g. 2x daily" className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Duration</Label>
                      <Input value={item.duration} onChange={(e) => updateItem(idx, "duration", e.target.value)} placeholder="e.g. 7 days" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Route</Label>
                      <select
                        value={item.route}
                        onChange={(e) => updateItem(idx, "route", e.target.value)}
                        className="h-8 text-xs rounded-lg border border-slate-200 bg-white px-2 w-full"
                      >
                        {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">
                        Total Qty
                        <span className="block text-[9px] font-normal text-slate-400">Full dispense count</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {createPrescription.error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(createPrescription.error as any)?.message || "Failed to create prescription"}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="h-9">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            className="h-9 bg-sky-600 hover:bg-sky-700 gap-1.5"
            onClick={() => createPrescription.mutate()}
            disabled={createPrescription.isPending || !selectedPatient}
          >
            {createPrescription.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {createPrescription.isPending ? "Creating..." : "Create Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPrescriptionDialog;
