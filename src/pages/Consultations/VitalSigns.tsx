import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import {
  HeartPulse, Plus, Loader2, AlertCircle, Thermometer,
  Activity, Scale, Droplets, Weight, Ruler, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import SearchableSelect from "@/components/ui/searchable-select";
import Pagination from "@/components/ui/pagination";

const VitalSigns = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: vitals, isLoading, isError, error } = useQuery({
    queryKey: ["all-vitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vital_signs")
        .select("*, consultation:consultations!consultation_id(id, created_at, patient:patients!patient_id(id, patient_id, first_name, last_name))");
      if (error) throw error;
      const sorted = (data || []).sort(
        (a, b) => new Date(b.consultation?.created_at || 0).getTime() - new Date(a.consultation?.created_at || 0).getTime()
      );
      return toCamel(sorted);
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

  const paginatedVitals = useMemo(() => {
    if (!Array.isArray(vitals)) return [];
    const start = (page - 1) * pageSize;
    return vitals.slice(start, start + pageSize);
  }, [vitals, page, pageSize]);

  useEffect(() => {
    const total = Array.isArray(vitals) ? vitals.length : 0;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [vitals, pageSize]);

  const addMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session. Please log in again.");

      const { data: consultation, error: consultError } = await supabase
        .from("consultations")
        .insert({
          patient_id: formData.patientId,
          doctor_id: session.user.id,
          chief_complaint: "Vitals Check",
        })
        .select("id")
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
        });
      if (vitalError) throw vitalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-vitals"] });
      setShowAddModal(false);
      setForm({});
    },
    onError: (err: any) => {
      const detail = err?.message || err?.error?.message || err?.error_description || JSON.stringify(err);
      if (detail?.includes("foreign key") || detail?.includes("violates")) {
        alert("Database constraint error: Your user profile needs to be set up. Please run the updated supabase-schema.sql in your Supabase SQL Editor to fix FK constraints.");
      } else {
        alert(`Failed to save vital signs: ${detail}`);
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
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
                <th className="px-4 py-3 text-left min-w-[180px]">Patient</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Temp (°C)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">BP (mmHg)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Pulse (bpm)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Weight (kg)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Height (cm)</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(vitals) || vitals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No vital signs recorded yet.</td>
                </tr>
              ) : (
                paginatedVitals.map((v: any) => {
                  const patient = v.consultation?.patient;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs truncate">{patient?.firstName} {patient?.lastName}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">{patient?.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{v.consultation?.createdAt ? new Date(v.consultation.createdAt).toLocaleString() : ""}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{v.temperature ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{v.bloodPressure ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{v.pulseRate ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{v.weight ?? "-"}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{v.height ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600" onClick={() => setShowDetailModal(v)}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageSize={pageSize} totalItems={Array.isArray(vitals) ? vitals.length : 0} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* View Detail Modal */}
      <Dialog open={!!showDetailModal} onOpenChange={(o) => { if (!o) setShowDetailModal(null); }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Vital Signs Details</DialogTitle>
            <DialogDescription>
                {showDetailModal?.consultation?.patient?.firstName} {showDetailModal?.consultation?.patient?.lastName} — {showDetailModal?.consultation?.createdAt ? new Date(showDetailModal.consultation.createdAt).toLocaleString() : ""}
              </DialogDescription>
            </DialogHeader>
            {showDetailModal && (() => {
              const vs = showDetailModal;
              const items = [
                { label: "Temperature", value: vs.temperature != null ? `${vs.temperature} °C` : "-", icon: Thermometer },
                { label: "Blood Pressure", value: vs.bloodPressure ?? "-", icon: Activity },
                { label: "Pulse Rate", value: vs.pulseRate != null ? `${vs.pulseRate} bpm` : "-", icon: HeartPulse },
                { label: "Respiratory Rate", value: vs.respiratoryRate != null ? `${vs.respiratoryRate} /min` : "-", icon: Activity },
                { label: "Oxygen Saturation", value: vs.oxygenSaturation != null ? `${vs.oxygenSaturation} %` : "-", icon: Droplets },
                { label: "Weight", value: vs.weight != null ? `${vs.weight} kg` : "-", icon: Scale },
                { label: "Height", value: vs.height != null ? `${vs.height} cm` : "-", icon: Ruler },
                { label: "BMI", value: vs.bmi ?? "-", icon: Weight },
              ];
            return (
              <div className="grid grid-cols-2 gap-4 py-4">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Icon className="w-3 h-3" /> {item.label}
                      </div>
                      <div className="font-semibold text-slate-900">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Vital Signs Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>Search for a patient and record their vital signs.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Patient <span className="text-red-500">*</span></Label>
              <SearchableSelect value={form.patientId || ""} onValueChange={(v) => setForm({ ...form, patientId: v })} placeholder="Search patient..." options={(Array.isArray(patients) ? patients : []).map((p: any) => ({value: p.id, label: `${p.firstName} ${p.lastName} (${p.patientId})`}))} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
