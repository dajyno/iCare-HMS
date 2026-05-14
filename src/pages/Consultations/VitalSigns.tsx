import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import {
  HeartPulse, Plus, Loader2, AlertCircle, Search, Thermometer,
  Activity, Scale, Droplets, Weight, Ruler, Clock, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import SearchableSelect from "@/components/ui/searchable-select";

const VitalSigns = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: vitals, isLoading, isError, error } = useQuery({
    queryKey: ["all-vitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("id, created_at, doctor_id, patient_id, vital_signs(*), patients!inner(id, patient_id, first_name, last_name)")
        .not("vital_signs", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .eq("status", "active")
        .order("last_name");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data: consultation, error: consultError } = await supabase
        .from("consultations")
        .insert({
          patient_id: formData.patientId,
          doctor_id: user?.id,
          chief_complaint: "Vitals Check",
        })
        .select()
        .single();
      if (consultError) throw consultError;

      const heightM = (formData.height || 0) / 100;
      const bmi = formData.weight && heightM ? (formData.weight / (heightM * heightM)).toFixed(1) : null;

      const { error: vitalError } = await supabase
        .from("vital_signs")
        .insert({
          consultation_id: consultation.id,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          blood_pressure: formData.bloodPressure || null,
          pulse_rate: formData.pulseRate ? parseInt(formData.pulseRate) : null,
          respiratory_rate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null,
          bmi: bmi ? parseFloat(bmi) : null,
          oxygen_saturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : null,
        })
        .select()
        .single();
      if (vitalError) throw vitalError;
      return vitalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-vitals"] });
      setShowAddModal(false);
      setForm({});
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(form);
  };

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (isError) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p>{error instanceof Error ? error.message : "Error loading vital signs"}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <HeartPulse className="w-7 h-7 text-rose-500" />
            Vital Signs
          </h1>
          <p className="text-sm text-slate-500">
            {Array.isArray(vitals) ? vitals.length : 0} records
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setForm({}); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Vital Signs
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Temp (°C)</th>
                <th className="px-4 py-3 text-center">BP (mmHg)</th>
                <th className="px-4 py-3 text-center">Pulse (bpm)</th>
                <th className="px-4 py-3 text-center">RR (/min)</th>
                <th className="px-4 py-3 text-center">SpO2 (%)</th>
                <th className="px-4 py-3 text-center">Weight (kg)</th>
                <th className="px-4 py-3 text-center">Height (cm)</th>
                <th className="px-4 py-3 text-center">BMI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(vitals) || vitals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">No vital signs recorded yet.</td>
                </tr>
              ) : (
                vitals.map((v: any) => {
                  const vs = v.vitalSigns;
                  const patient = v.patients;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{patient?.firstName} {patient?.lastName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{patient?.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.temperature ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.bloodPressure ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.pulseRate ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.respiratoryRate ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.oxygenSaturation ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.weight ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.height ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{vs?.bmi ?? "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vital Signs Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>Search for a patient and record their vital signs.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Patient <span className="text-red-500">*</span></Label>
              <SearchableSelect value={form.patientId || ""} onValueChange={(v) => setForm({ ...form, patientId: v })} placeholder="Search patient..." options={(Array.isArray(patients) ? patients : []).map((p: any) => ({value: p.id, label: `${p.firstName} ${p.lastName} (${p.patientId})`}))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temp (°C)</Label>
                <Input type="number" step="0.1" value={form.temperature || ""} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Activity className="w-3 h-3" /> BP (mmHg)</Label>
                <Input placeholder="120/80" value={form.bloodPressure || ""} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><HeartPulse className="w-3 h-3 inline mr-1" /> Pulse (bpm)</Label>
                <Input type="number" value={form.pulseRate || ""} onChange={(e) => setForm({ ...form, pulseRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Activity className="w-3 h-3 inline mr-1" /> RR (/min)</Label>
                <Input type="number" value={form.respiratoryRate || ""} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Droplets className="w-3 h-3 inline mr-1" /> SpO2 (%)</Label>
                <Input type="number" value={form.oxygenSaturation || ""} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Scale className="w-3 h-3 inline mr-1" /> Weight (kg)</Label>
                <Input type="number" step="0.1" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Ruler className="w-3 h-3 inline mr-1" /> Height (cm)</Label>
                <Input type="number" step="0.1" value={form.height || ""} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VitalSigns;
