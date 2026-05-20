import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ClipboardList, Pill, Save, Trash2, Plus, ArrowLeft, Loader2,
  Thermometer, Activity, HeartPulse, Droplets, Scale, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const consultationSchema = z.object({
  patientId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpTime: z.string().optional(),
  prescriptions: z.array(z.object({
    medicationId: z.string(),
    medicationName: z.string().optional(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
    route: z.string().optional(),
    quantity: z.number().optional(),
  })).optional(),
  labRequests: z.array(z.object({
    testId: z.string(),
  })).optional(),
  radiologyRequests: z.array(z.object({
    examId: z.string(),
  })).optional(),
});

const ConsultationWorkspace = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const consultationIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedPrescriptions, setSavedPrescriptions] = useState<any[]>([]);
  const [savedLabs, setSavedLabs] = useState<any[]>([]);
  const [savedRadiology, setSavedRadiology] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      prescriptions: [],
      labRequests: [],
      radiologyRequests: [],
    },
  });
  const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = form;
  const watchPrescriptions = watch("prescriptions");
  const watchLabRequests = watch("labRequests");
  const watchRadiologyRequests = watch("radiologyRequests");

  const { fields: prescriptionFields, append: appendPrescription, remove: removePrescription, replace: replacePrescriptions } = useFieldArray({ control, name: "prescriptions" as any });
  const { fields: labFields, append: appendLab, remove: removeLab, replace: replaceLabs } = useFieldArray({ control, name: "labRequests" as any });
  const { fields: radFields, append: appendRad, remove: removeRad, replace: replaceRads } = useFieldArray({ control, name: "radiologyRequests" as any });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("registration_date", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: medications } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medications").select("*").order("name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: labTests } = useQuery({
    queryKey: ["labTests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_tests").select("*").eq("status", "active");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: radiologyExams } = useQuery({
    queryKey: ["radiologyExams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("radiology_exams").select("*, category:radiology_categories(name)").eq("status", "active");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: patientVitals } = useQuery({
    queryKey: ["patient-vitals-display", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("consultations").select("id, vital_signs(*)").eq("patient_id", patientId).not("vital_signs", "is", null).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const c = toCamel(data[0]);
      return c.vitalSigns ? { ...c.vitalSigns, consultationId: c.id } : null;
    },
    enabled: !!patientId,
  });

  const lookupId = selectedPatient?.id || patientId;

  const { data: existingConsultation, isLoading: existingLoading } = useQuery({
    queryKey: ["existing-consultation", lookupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("consultations").select("*").eq("patient_id", lookupId).in("status", ["VitalsRecorded", "InProgress"]).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data && data.length > 0 ? toCamel(data[0]) : null;
    },
    enabled: !!lookupId,
  });

  const { data: existingPrescriptions } = useQuery({
    queryKey: ["existing-prescriptions", consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, items:prescription_items(*, medication:medications(name, strength))")
        .eq("consultation_id", consultationId)
        .order("date", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!consultationId,
  });

  const { data: existingLabRequests } = useQuery({
    queryKey: ["existing-labs", consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, test:lab_tests(name, category)")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!consultationId,
  });

  const { data: existingRadiologyRequests } = useQuery({
    queryKey: ["existing-radiology", consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      const { data, error } = await supabase
        .from("radiology_requests")
        .select("*, exam:radiology_exams(name)")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!consultationId,
  });

  useEffect(() => {
    if (patientId && Array.isArray(patients)) {
      const p = patients.find((p: any) => p.id === patientId);
      if (p) {
        setSelectedPatient(p);
        setValue("patientId", p.id as any);
      }
    }
  }, [patientId, patients]);

  useEffect(() => {
    if (existingConsultation) {
      const cId = existingConsultation.id;
      setConsultationId(cId);
      consultationIdRef.current = cId;
      setValue("chiefComplaint", existingConsultation.chiefComplaint || "Consultation");
      setValue("symptoms", existingConsultation.symptoms || "");
      setValue("diagnosis", existingConsultation.diagnosis || "");
      setValue("clinicalNotes", existingConsultation.clinicalNotes || "");
      setValue("treatmentPlan", existingConsultation.treatmentPlan || "");
      setValue("followUpDate", existingConsultation.followUpDate ? existingConsultation.followUpDate.substring(0, 10) : "");

      if (existingConsultation.status === "VitalsRecorded") {
        supabase.from("consultations").update({ status: "InProgress" }).eq("id", cId).then(() => {
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        });
      }
    }
  }, [existingConsultation]);

  useEffect(() => {
    if (existingPrescriptions?.length > 0) {
      const rxItems = existingPrescriptions.flatMap((rx: any) =>
        (rx.items || []).map((item: any) => ({
          medicationId: item.medicationId,
          medicationName: item.medication?.name || "",
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || "",
          route: item.instructions || "",
          quantity: item.quantity || 1,
        }))
      );
      if (rxItems.length > 0) replacePrescriptions(rxItems);
    }
    if (existingLabRequests?.length > 0) {
      replaceLabs(existingLabRequests.map((lr: any) => ({ testId: lr.testId })));
    }
    if (existingRadiologyRequests?.length > 0) {
      replaceRads(existingRadiologyRequests.map((rr: any) => ({ examId: rr.examId })));
    }
  }, [existingPrescriptions, existingLabRequests, existingRadiologyRequests]);

  const clearFeedback = () => { setError(null); setSuccess(null); };

  const ensureConsultation = async (pId: string): Promise<string> => {
    if (consultationIdRef.current) return consultationIdRef.current;
    const { data: existing } = await supabase.from("consultations").select("id").eq("patient_id", pId).in("status", ["VitalsRecorded", "InProgress"]).order("created_at", { ascending: false }).limit(1);
    if (existing && existing.length > 0) {
      consultationIdRef.current = existing[0].id;
      setConsultationId(existing[0].id);
      return existing[0].id;
    }
    const { data, error } = await supabase.from("consultations").insert({
      patient_id: pId,
      doctor_id: user?.id,
      status: "InProgress",
      chief_complaint: watch("chiefComplaint") || "New consultation",
    }).select("id").single();
    if (error) throw error;
    consultationIdRef.current = data.id;
    setConsultationId(data.id);
    return data.id;
  };

  const saveClinicalNotes = useMutation({
    mutationFn: async (formData: any) => {
      const pId = formData.patientId || selectedPatient?.id;
      if (!pId) throw new Error("No patient selected");
      const cId = await ensureConsultation(pId);
      const { error } = await supabase.from("consultations").update({
        chief_complaint: formData.chiefComplaint,
        symptoms: formData.symptoms || null,
        diagnosis: formData.diagnosis || null,
        clinical_notes: formData.clinicalNotes || null,
        treatment_plan: formData.treatmentPlan || null,
      }).eq("id", cId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess("Clinical notes saved");
      queryClient.refetchQueries({ queryKey: ["consultations"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save clinical notes");
    },
  });

  const savePrescriptions = useMutation({
    mutationFn: async () => {
      const items = watchPrescriptions || [];
      if (items.length === 0) return null;
      const pId = selectedPatient?.id;
      if (!pId) throw new Error("No patient selected");
      const cId = await ensureConsultation(pId);
      const { data: prescription, error: rxError } = await supabase.from("prescriptions").insert({
        patient_id: pId, doctor_id: user?.id, consultation_id: cId, status: "Pending",
      }).select("*, items:prescription_items(*, medication:medications(name, strength))").single();
      if (rxError) throw rxError;
      const itemRows = items.map((p: any) => ({
        prescription_id: prescription.id, medication_id: p.medicationId,
        dosage: p.dosage, frequency: p.frequency, duration: p.duration,
        instructions: p.route || null, quantity: p.quantity || 1,
      }));
      const { error: itemsError } = await supabase.from("prescription_items").insert(itemRows);
      if (itemsError) throw itemsError;
      const medIds = items.map((p: any) => p.medicationId);
      const { data: medPrices } = await supabase.from("medications").select("id, unit_price").in("id", medIds);
      const priceMap = new Map((medPrices || []).map((m: any) => [m.id, m.unit_price || 0]));
      const totalAmount = itemRows.reduce((sum, item) => sum + (priceMap.get(item.medication_id) || 0) * item.quantity, 0);
      const { error: invError } = await supabase.from("invoices").insert({
        invoice_number: `PHA-${Date.now()}`,
        patient_id: pId, prescription_id: prescription.id,
        source_type: "Pharmacy", status: "Unpaid",
        total_amount: totalAmount, amount_paid: 0, balance: totalAmount,
      });
      if (invError) throw invError;
      const { error: statusError } = await supabase.from("prescriptions").update({ status: "Unpaid" }).eq("id", prescription.id);
      if (statusError) throw statusError;
      const { data: fullRx } = await supabase.from("prescriptions").select("*, items:prescription_items(*, medication:medications(name, strength))").eq("id", prescription.id).single();
      return toCamel(fullRx);
    },
    onSuccess: (savedRx) => {
      setSuccess("Prescriptions saved");
      replacePrescriptions([]);
      if (savedRx) setSavedPrescriptions((prev) => [...prev, savedRx]);
      queryClient.refetchQueries({ queryKey: ["consultations"] });
      if (selectedPatient?.id) {
        queryClient.invalidateQueries({ queryKey: ["patient-rx", selectedPatient.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save prescriptions");
    },
  });

  const saveLabRequests = useMutation({
    mutationFn: async () => {
      const items = watchLabRequests || [];
      if (items.length === 0) return;
      const pId = selectedPatient?.id;
      if (!pId) throw new Error("No patient selected");
      const cId = await ensureConsultation(pId);
      const inserts = items.map((lr: any) => ({
        patient_id: pId, test_id: lr.testId, consultation_id: cId, status: "Requested",
      }));
      const { error } = await supabase.from("lab_requests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess("Lab requests saved");
      replaceLabs([]);
      queryClient.refetchQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient-labs"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save lab requests");
    },
  });

  const saveRadiology = useMutation({
    mutationFn: async () => {
      const items = watchRadiologyRequests || [];
      if (items.length === 0) return;
      const pId = selectedPatient?.id;
      if (!pId) throw new Error("No patient selected");
      const cId = await ensureConsultation(pId);
      const inserts = items.map((rr: any) => ({
        patient_id: pId, exam_id: rr.examId, requested_by_id: user?.id, consultation_id: cId, status: "Requested",
      }));
      const { error } = await supabase.from("radiology_requests").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess("Radiology requests saved");
      replaceRads([]);
      queryClient.refetchQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      queryClient.invalidateQueries({ queryKey: ["patient-radiology-requests"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save radiology requests");
    },
  });

  const completeConsultation = useMutation({
    mutationFn: async (formData: any) => {
      const pId = formData.patientId || selectedPatient?.id;
      if (!pId) throw new Error("No patient selected");
      let cId = consultationIdRef.current;

      if (!cId) {
        const { data, error } = await supabase.from("consultations").select("id").eq("patient_id", pId).in("status", ["VitalsRecorded", "InProgress"]).order("created_at", { ascending: false }).limit(1);
        if (error) throw error;
        cId = data?.[0]?.id || null;
      }

      if (cId) {
        const { error } = await supabase.from("consultations").update({
          chief_complaint: formData.chiefComplaint,
          symptoms: formData.symptoms || null,
          diagnosis: formData.diagnosis || null,
          clinical_notes: formData.clinicalNotes || null,
          treatment_plan: formData.treatmentPlan || null,
          follow_up_date: formData.followUpDate || null,
          status: "Completed",
        }).eq("id", cId);
        if (error) throw error;
        consultationIdRef.current = cId;
      } else {
        const { data, error } = await supabase.from("consultations").insert({
          patient_id: pId, doctor_id: user?.id,
          chief_complaint: formData.chiefComplaint,
          symptoms: formData.symptoms || null,
          diagnosis: formData.diagnosis || null,
          clinical_notes: formData.clinicalNotes || null,
          treatment_plan: formData.treatmentPlan || null,
          follow_up_date: formData.followUpDate || null,
          status: "Completed",
        }).select("id").single();
        if (error) throw error;
        cId = data.id;
        consultationIdRef.current = data.id;
      }

      if (formData.prescriptions?.length > 0) {
        const { data: prescription, error: rxError } = await supabase.from("prescriptions").insert({
          patient_id: pId, doctor_id: user?.id, consultation_id: cId, status: "Pending",
        }).select("id").single();
        if (rxError) throw rxError;
        const itemRows = formData.prescriptions.map((p: any) => ({
          prescription_id: prescription.id, medication_id: p.medicationId,
          dosage: p.dosage, frequency: p.frequency, duration: p.duration,
          instructions: p.route || null, quantity: p.quantity || 1,
        }));
        const { error: itemsError } = await supabase.from("prescription_items").insert(itemRows);
        if (itemsError) throw itemsError;
        const medIds = formData.prescriptions.map((p: any) => p.medicationId);
        const { data: medPrices } = await supabase.from("medications").select("id, unit_price").in("id", medIds);
        const priceMap = new Map((medPrices || []).map((m: any) => [m.id, m.unit_price || 0]));
        const totalAmount = itemRows.reduce((sum, item) => sum + (priceMap.get(item.medication_id) || 0) * item.quantity, 0);
        const { error: invError } = await supabase.from("invoices").insert({
          invoice_number: `PHA-${Date.now()}`,
          patient_id: pId, prescription_id: prescription.id,
          source_type: "Pharmacy", status: "Unpaid",
          total_amount: totalAmount, amount_paid: 0, balance: totalAmount,
        });
        if (invError) throw invError;
        const { error: statusError } = await supabase.from("prescriptions").update({ status: "Unpaid" }).eq("id", prescription.id);
        if (statusError) throw statusError;
      }

      if (formData.labRequests?.length > 0) {
        const labInserts = formData.labRequests.map((lr: any) => ({
          patient_id: pId, test_id: lr.testId, consultation_id: cId, status: "Requested",
        }));
        const { error } = await supabase.from("lab_requests").insert(labInserts);
        if (error) throw error;
      }

      if (formData.radiologyRequests?.length > 0) {
        const radInserts = formData.radiologyRequests.map((rr: any) => ({
          patient_id: pId, exam_id: rr.examId, requested_by_id: user?.id, consultation_id: cId, status: "Requested",
        }));
        const { error } = await supabase.from("radiology_requests").insert(radInserts);
        if (error) throw error;
      }

      if (formData.followUpDate && formData.followUpTime) {
        await supabase.from("appointments").insert({
          patient_id: pId, doctor_id: user?.id,
          date: formData.followUpDate, time: formData.followUpTime,
          reason: `Follow-up: ${formData.chiefComplaint}`,
          status: "Scheduled",
        });
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["all-vitals"] });
      if (selectedPatient?.id) {
        queryClient.invalidateQueries({ queryKey: ["patient-rx", selectedPatient.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["patient-labs"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      reset();
      setConsultationId(null);
      consultationIdRef.current = null;
      setSelectedPatient(null);
      navigate("/consultations");
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to complete consultation");
    },
  });

  const onComplete = (data: any) => {
    setError(null);
    const pId = data.patientId || selectedPatient?.id;
    if (!pId) { setError("No patient selected. Please select a patient first."); return; }
    completeConsultation.mutate(data);
  };

  const onFormError = (formErrors: any) => {
    const first = Object.entries(formErrors)[0];
    if (first) setError(`Form error: ${first[0]} — ${(first[1] as any)?.message || "invalid"}`);
    else setError("Please fix the form errors before submitting.");
  };

  if (patientsLoading || existingLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onComplete, onFormError)} className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/consultations")} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clinical Workspace</h1>
            <p className="text-slate-500 mt-1">
              {patientId ? "Continue patient encounter" : "Start a new patient encounter"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button type="button" className="ml-auto text-red-500 hover:text-red-700 font-bold" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <CardTitle>Encounter Details</CardTitle>
          <CardDescription>Select a patient</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Patient</Label>
            <SearchableSelect
              value={selectedPatient?.id || ""}
              onValueChange={(val) => {
                const p = Array.isArray(patients) ? patients.find((p: any) => p.id === val) : null;
                setSelectedPatient(p);
                setValue("patientId", val as any);
                setConsultationId(null);
                consultationIdRef.current = null;
                clearFeedback();
              }}
              placeholder="Search or select patient..."
              options={(Array.isArray(patients) ? patients : []).map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName} (${p.patientId})` }))}
            />
          </div>
        </CardContent>
      </Card>

      {selectedPatient && (
        <div className="space-y-8">
          {patientVitals && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-gradient-to-r from-blue-50/30 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-slate-700">Recorded Vital Signs</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                  {patientVitals.temperature != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">Temp</span><span className="font-semibold text-slate-900 flex items-center gap-1"><Thermometer className="w-3 h-3 text-rose-400" />{patientVitals.temperature}°C</span></div>
                  )}
                  {patientVitals.bloodPressure && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">BP</span><span className="font-semibold text-slate-900 flex items-center gap-1"><HeartPulse className="w-3 h-3 text-red-400" />{patientVitals.bloodPressure}</span></div>
                  )}
                  {patientVitals.pulseRate != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">Pulse</span><span className="font-semibold text-slate-900">{patientVitals.pulseRate} bpm</span></div>
                  )}
                  {patientVitals.oxygenSaturation != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">SpO₂</span><span className="font-semibold text-slate-900 flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400" />{patientVitals.oxygenSaturation}%</span></div>
                  )}
                  {patientVitals.weight != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">Weight</span><span className="font-semibold text-slate-900 flex items-center gap-1"><Scale className="w-3 h-3 text-slate-400" />{patientVitals.weight} kg</span></div>
                  )}
                  {patientVitals.respiratoryRate != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">RR</span><span className="font-semibold text-slate-900">{patientVitals.respiratoryRate} /min</span></div>
                  )}
                  {patientVitals.bmi != null && (
                    <div className="bg-white rounded-lg p-2.5 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400 block">BMI</span><span className="font-semibold text-slate-900">{patientVitals.bmi}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="clinical" className="w-full">
            <TabsList className="bg-white border p-1 h-auto mb-6 overflow-x-auto flex-nowrap">
              <TabsTrigger value="clinical" className="gap-2 px-4 py-2">
                <ClipboardList className="w-4 h-4" /> Clinical Notes
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2 px-4 py-2">
                <Pill className="w-4 h-4" /> Orders & Prescriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clinical" className="space-y-6">
              <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="pt-6 grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="chiefComplaint">Chief Complaint <span className="text-red-500">*</span></Label>
                    <Input id="chiefComplaint" {...register("chiefComplaint")} placeholder="e.g. Persistent cough, chest pain..." className={errors.chiefComplaint ? "border-red-500" : ""} />
                    {errors.chiefComplaint && <p className="text-xs text-red-500">Chief complaint is required (min 3 characters)</p>}
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="symptoms">Symptoms</Label>
                      <Textarea id="symptoms" {...register("symptoms")} placeholder="Record symptoms..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diagnosis">Diagnosis</Label>
                      <Textarea id="diagnosis" {...register("diagnosis")} placeholder="Enter diagnosis..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicalNotes">Clinical Observations</Label>
                    <Textarea id="clinicalNotes" {...register("clinicalNotes")} placeholder="Detailed examination notes..." className="min-h-[120px]" />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit((data) => saveClinicalNotes.mutate(data), onFormError)} disabled={saveClinicalNotes.isPending}>
                      {saveClinicalNotes.isPending ? "Saving..." : <><Save className="w-3 h-3 mr-1" /> Save Clinical Notes</>}
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="followUpDate">Follow-up Date</Label>
                      <Input id="followUpDate" type="date" {...register("followUpDate")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followUpTime">Follow-up Time</Label>
                      <Input id="followUpTime" type="time" {...register("followUpTime")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-8">
              {/* Prescriptions */}
              <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                  <div>
                    <CardTitle className="text-lg">Prescriptions</CardTitle>
                    <CardDescription>Medications to be dispensed by pharmacy</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPrescription({ medicationId: "", dosage: "", frequency: "", duration: "", route: "", quantity: 1 })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Drug
                    </Button>
                    <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => savePrescriptions.mutate()} disabled={savePrescriptions.isPending || (watchPrescriptions?.length || 0) === 0}>
                      {savePrescriptions.isPending ? "Saving..." : <><Save className="w-3 h-3 mr-1" /> Save</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {prescriptionFields.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No medications added</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {prescriptionFields.map((field, index) => (
                        <div key={field.id} className="p-4 grid grid-cols-2 md:grid-cols-7 gap-4 items-end">
                          <div className="md:col-span-2 space-y-2">
                            <Label>Medication</Label>
                            <SearchableSelect value={watchPrescriptions?.[index]?.medicationId || ""} onValueChange={(val) => {
                              setValue(`prescriptions.${index}.medicationId` as any, val as any);
                              const med = Array.isArray(medications) ? medications.find((m: any) => m.id === val) : null;
                              if (med) setValue(`prescriptions.${index}.medicationName` as any, med.name as any);
                            }} placeholder="Select drug" options={(Array.isArray(medications) ? medications : []).map((m: any) => ({ value: m.id, label: `${m.name} (${m.strength}) — ₦${m.unitPrice || 0}` }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Dosage</Label>
                            <Input {...register(`prescriptions.${index}.dosage` as any)} placeholder="1 tab, 5ml..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Input {...register(`prescriptions.${index}.frequency` as any)} placeholder="OD, BD, TDS..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <Input {...register(`prescriptions.${index}.duration` as any)} placeholder="5 days, 1 week..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Route</Label>
                            <select {...register(`prescriptions.${index}.route` as any)} className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="">Select...</option>
                              <option value="Oral">Oral</option>
                              <option value="IV">IV</option>
                              <option value="IM">IM</option>
                              <option value="Subcutaneous">Subcutaneous</option>
                              <option value="Topical">Topical</option>
                              <option value="Inhalation">Inhalation</option>
                              <option value="Ophthalmic">Ophthalmic</option>
                              <option value="Otic">Otic</option>
                              <option value="Rectal">Rectal</option>
                              <option value="Sublingual">Sublingual</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Qty</Label>
                            <Input {...register(`prescriptions.${index}.quantity` as any)} type="number" min="1" defaultValue={1} placeholder="1" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => removePrescription(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lab Requests */}
              <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                  <div>
                    <CardTitle className="text-lg">Laboratory Requests</CardTitle>
                    <CardDescription>Tests to be performed in the lab</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLab({ testId: "" })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Test
                    </Button>
                    <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveLabRequests.mutate()} disabled={saveLabRequests.isPending || (watchLabRequests?.length || 0) === 0}>
                      {saveLabRequests.isPending ? "Saving..." : <><Save className="w-3 h-3 mr-1" /> Save</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {labFields.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No laboratory tests requested</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {labFields.map((field, index) => (
                        <div key={field.id} className="p-4 flex items-end gap-6">
                          <div className="flex-1 space-y-2">
                            <Label>Test Name</Label>
                            <SearchableSelect value={watchLabRequests?.[index]?.testId || ""} onValueChange={(val) => setValue(`labRequests.${index}.testId` as any, val as any)} placeholder="Select laboratory test..." options={(Array.isArray(labTests) ? labTests : []).map((t: any) => ({ value: t.id, label: `${t.name} (₦${t.price})` }))} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => removeLab(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Radiology Requests */}
              <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                  <div>
                    <CardTitle className="text-lg">Radiology Requests</CardTitle>
                    <CardDescription>Imaging exams to be performed</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => appendRad({ examId: "" })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Exam
                    </Button>
                    <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveRadiology.mutate()} disabled={saveRadiology.isPending || (watchRadiologyRequests?.length || 0) === 0}>
                      {saveRadiology.isPending ? "Saving..." : <><Save className="w-3 h-3 mr-1" /> Save</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {radFields.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No radiology exams requested</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {radFields.map((field, index) => (
                        <div key={field.id} className="p-4 flex items-end gap-6">
                          <div className="flex-1 space-y-2">
                            <Label>Exam</Label>
                            <SearchableSelect value={watchRadiologyRequests?.[index]?.examId || ""} onValueChange={(val) => setValue(`radiologyRequests.${index}.examId` as any, val as any)} placeholder="Select radiology exam..." options={(Array.isArray(radiologyExams) ? radiologyExams : []).map((e: any) => ({ value: e.id, label: `${e.name}${e.category?.name ? ` (${e.category.name})` : ""} — ₦${e.price}` }))} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => removeRad(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <span>{success}</span>
              <button type="button" className="ml-auto text-emerald-500 hover:text-emerald-700 font-bold" onClick={() => setSuccess(null)}>&times;</button>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" className="h-12 px-8" onClick={() => navigate("/consultations")}>Cancel</Button>
            <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-bold" disabled={completeConsultation.isPending}>
              {completeConsultation.isPending ? "Saving..." : (
                <><Save className="w-4 h-4 mr-2" /> Complete Consultation</>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};

export default ConsultationWorkspace;
