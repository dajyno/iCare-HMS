import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ClipboardList, 
  Pill, 
  Save,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Thermometer, 
  Activity, 
  HeartPulse,
  Droplets,
  Scale,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const consultationSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().min(3),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),
  prescriptions: z.array(z.object({
    medicationId: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
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
  const [existingConsultationId, setExistingConsultationId] = useState<string | null>(null);

  const { data: patients } = useQuery({
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

  const { data: medications } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: labTests } = useQuery({
    queryKey: ["labTests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: radiologyExams } = useQuery({
    queryKey: ["radiologyExams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_exams")
        .select("*, category:radiology_categories(name)")
        .eq("status", "active");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: patientVitals } = useQuery({
    queryKey: ["patient-vitals", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("id, vital_signs(*)")
        .eq("patient_id", patientId)
        .not("vital_signs", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const c = toCamel(data[0]);
      return c.vitalSigns ? { ...c.vitalSigns, consultationId: c.id } : null;
    },
    enabled: !!patientId,
  });

  const { data: existingConsultation } = useQuery({
    queryKey: ["existing-consultation", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .in("status", ["VitalsRecorded", "InProgress"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return toCamel(data[0]);
    },
    enabled: !!patientId,
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
      setExistingConsultationId(existingConsultation.id);
      setValue("chiefComplaint", existingConsultation.chiefComplaint || "");
      setValue("symptoms", existingConsultation.symptoms || "");
      setValue("diagnosis", existingConsultation.diagnosis || "");
      setValue("clinicalNotes", existingConsultation.clinicalNotes || "");
      setValue("treatmentPlan", existingConsultation.treatmentPlan || "");
    }
  }, [existingConsultation]);

  const form = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      prescriptions: [],
      labRequests: [],
      radiologyRequests: [],
    }
  });
  const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = form;

  const watchPrescriptions = watch("prescriptions");
  const watchLabRequests = watch("labRequests");
  const watchRadiologyRequests = watch("radiologyRequests");

  const { fields: prescriptionFields, append: appendPrescription, remove: removePrescription } = useFieldArray({
    control,
    name: "prescriptions" as any,
  });

  const { fields: labFields, append: appendLab, remove: removeLab } = useFieldArray({
    control,
    name: "labRequests" as any,
  });

  const { fields: radFields, append: appendRad, remove: removeRad } = useFieldArray({
    control,
    name: "radiologyRequests" as any,
  });

  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      const consultationId = existingConsultationId;

      if (consultationId) {
        const { error: consultError } = await supabase
          .from("consultations")
          .update({
            chief_complaint: formData.chiefComplaint,
            symptoms: formData.symptoms || null,
            diagnosis: formData.diagnosis || null,
            clinical_notes: formData.clinicalNotes || null,
            treatment_plan: formData.treatmentPlan || null,
            status: "Completed",
          })
          .eq("id", consultationId);
        if (consultError) throw consultError;
      } else {
        const { data: consultation, error: consultError } = await supabase
          .from("consultations")
          .insert({
            patient_id: formData.patientId,
            doctor_id: user?.id,
            appointment_id: formData.appointmentId || null,
            chief_complaint: formData.chiefComplaint,
            symptoms: formData.symptoms || null,
            diagnosis: formData.diagnosis || null,
            clinical_notes: formData.clinicalNotes || null,
            treatment_plan: formData.treatmentPlan || null,
            status: "Completed",
          })
          .select()
          .single();
        if (consultError) throw consultError;
      }

      if (formData.prescriptions?.length > 0) {
        const { data: prescription, error: rxError } = await supabase
          .from("prescriptions")
          .insert({
            patient_id: formData.patientId,
            doctor_id: user?.id,
            consultation_id: consultationId,
            status: "Pending",
          })
          .select()
          .single();
        if (rxError) throw rxError;

        const items = formData.prescriptions.map((p: any) => ({
          prescription_id: prescription.id,
          medication_id: p.medicationId,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions || null,
        }));

        const { error: itemsError } = await supabase
          .from("prescription_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      if (formData.labRequests?.length > 0) {
        const labInserts = formData.labRequests.map((lr: any) => ({
          patient_id: formData.patientId,
          test_id: lr.testId,
          consultation_id: consultationId,
          status: "Requested",
        }));
        const { error: labError } = await supabase
          .from("lab_requests")
          .insert(labInserts);
        if (labError) throw labError;
      }

      if (formData.radiologyRequests?.length > 0) {
        const radInserts = formData.radiologyRequests.map((rr: any) => ({
          patient_id: formData.patientId,
          exam_id: rr.examId,
          consultation_id: consultationId,
          status: "Requested",
        }));
        const { error: radError } = await supabase
          .from("radiology_requests")
          .insert(radInserts);
        if (radError) throw radError;
      }

      if (formData.appointmentId) {
        await supabase
          .from("appointments")
          .update({ status: "Completed" })
          .eq("id", formData.appointmentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["all-vitals"] });
      reset();
      setSelectedPatient(null);
      setExistingConsultationId(null);
      navigate("/consultations");
    }
  });

  const onFormSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/consultations")} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Clinical Workspace
            </h1>
            <p className="text-slate-500 mt-1">
              {patientId ? "Continue patient encounter" : "Start a new patient encounter"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
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
                  setExistingConsultationId(null);
                }}
                placeholder="Search or select patient..."
                options={(Array.isArray(patients) ? patients : []).map((p: any) => ({value: p.id, label: `${p.firstName} ${p.lastName} (${p.patientId})`}))}
              />
            </div>
          </CardContent>
        </Card>

        {selectedPatient && (
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
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
                  <ClipboardList className="w-4 h-4" />
                  Clinical Notes
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2 px-4 py-2">
                  <Pill className="w-4 h-4" />
                  Orders & Prescriptions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="clinical" className="space-y-6">
                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                  <CardContent className="pt-6 grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="chiefComplaint">Chief Complaint <span className="text-red-500">*</span></Label>
                      <Input
                        id="chiefComplaint"
                        {...register("chiefComplaint")}
                        placeholder="e.g. Persistent cough, chest pain..."
                        className={errors.chiefComplaint ? "border-red-500" : ""}
                      />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPrescription({ medicationId: "", dosage: "", frequency: "", duration: "" })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Drug
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {prescriptionFields.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">No medications added</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {prescriptionFields.map((field, index) => (
                          <div key={field.id} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="md:col-span-1 space-y-2">
                              <Label>Medication</Label>
                              <SearchableSelect value={watchPrescriptions?.[index]?.medicationId || ""} onValueChange={(val) => setValue(`prescriptions.${index}.medicationId` as any, val as any)} placeholder="Select drug" options={(Array.isArray(medications) ? medications : []).map((m: any) => ({value: m.id, label: `${m.name} (${m.strength})`}))} />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLab({ testId: "" })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Test
                    </Button>
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
                              <SearchableSelect value={watchLabRequests?.[index]?.testId || ""} onValueChange={(val) => setValue(`labRequests.${index}.testId` as any, val as any)} placeholder="Select laboratory test..." options={(Array.isArray(labTests) ? labTests : []).map((t: any) => ({value: t.id, label: `${t.name} (₦${t.price})`}))} />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => appendRad({ examId: "" })}>
                      <Plus className="w-4 h-4 mr-2" /> Add Exam
                    </Button>
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
                              <SearchableSelect value={watchRadiologyRequests?.[index]?.examId || ""} onValueChange={(val) => setValue(`radiologyRequests.${index}.examId` as any, val as any)} placeholder="Select radiology exam..." options={(Array.isArray(radiologyExams) ? radiologyExams : []).map((e: any) => ({value: e.id, label: `${e.name}${e.category?.name ? ` (${e.category.name})` : ""} — ₦${e.price}`}))} />
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

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" className="h-12 px-8" onClick={() => navigate("/consultations")}>Cancel</Button>
              <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-bold" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Complete Consultation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ConsultationWorkspace;
