import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel, ensureUserProfile } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Thermometer, 
  Activity, 
  Scale, 
  ClipboardList, 
  Pill, 
  Save,
  Trash2,
  Plus
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
  vitalSigns: z.object({
    temperature: z.coerce.number().optional(),
    bloodPressure: z.string().optional(),
    pulseRate: z.coerce.number().optional(),
    respiratoryRate: z.coerce.number().optional(),
    weight: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
    oxygenSaturation: z.coerce.number().optional(),
  }).optional(),
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
});

const ConsultationWorkspace = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

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

  const form = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      prescriptions: [],
      labRequests: [],
    }
  });
  const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = form;

  const watchPrescriptions = watch("prescriptions");
  const watchLabRequests = watch("labRequests");

  const { fields: prescriptionFields, append: appendPrescription, remove: removePrescription } = useFieldArray({
    control,
    name: "prescriptions" as any,
  });

  const { fields: labFields, append: appendLab, remove: removeLab } = useFieldArray({
    control,
    name: "labRequests" as any,
  });

  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      await ensureUserProfile(user);
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
        })
        .select()
        .single();
      if (consultError) throw consultError;

      if (formData.vitalSigns) {
        const { error: vitalError } = await supabase
          .from("vital_signs")
          .insert({
            consultation_id: consultation.id,
            temperature: formData.vitalSigns.temperature || null,
            blood_pressure: formData.vitalSigns.bloodPressure || null,
            pulse_rate: formData.vitalSigns.pulseRate || null,
            weight: formData.vitalSigns.weight || null,
            oxygen_saturation: formData.vitalSigns.oxygenSaturation || null,
          });
        if (vitalError) throw vitalError;
      }

      if (formData.prescriptions?.length > 0) {
        const { data: prescription, error: rxError } = await supabase
          .from("prescriptions")
          .insert({
            patient_id: formData.patientId,
            doctor_id: user?.id,
            consultation_id: consultation.id,
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
          consultation_id: consultation.id,
          status: "Requested",
        }));
        const { error: labError } = await supabase
          .from("lab_requests")
          .insert(labInserts);
        if (labError) throw labError;
      }

      if (formData.appointmentId) {
        await supabase
          .from("appointments")
          .update({ status: "Completed" })
          .eq("id", formData.appointmentId);
      }

      return consultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      reset();
      setSelectedPatient(null);
      alert("Consultation saved successfully!");
    }
  });

  const onFormSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Clinical Workspace
          </h1>
          <p className="text-slate-500 mt-1">Start a new patient encounter</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Patient Selection */}
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle>Ecnounter Details</CardTitle>
            <CardDescription>Select a patient and associated appointment</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Patient</Label>
              <SearchableSelect value={selectedPatient?.id || ""} onValueChange={(val) => {
                const p = Array.isArray(patients) ? patients.find((p: any) => p.id === val) : null;
                setSelectedPatient(p);
                setValue("patientId", val as any);
              }} placeholder="Search or select patient..." options={(Array.isArray(patients) ? patients : []).map((p: any) => ({value: p.id, label: `${p.firstName} ${p.lastName} (${p.patientId})`}))} />
            </div>
          </CardContent>
        </Card>

        {selectedPatient && (
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
            <Tabs defaultValue="clinical" className="w-full">
              <TabsList className="bg-white border p-1 h-auto mb-6 overflow-x-auto flex-nowrap">
                <TabsTrigger value="clinical" className="gap-2 px-4 py-2">
                  <ClipboardList className="w-4 h-4" />
                  Clinical Notes
                </TabsTrigger>
                <TabsTrigger value="vitals" className="gap-2 px-4 py-2">
                  <Activity className="w-4 h-4" />
                  Vital Signs
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

              <TabsContent value="vitals" className="space-y-6">
                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                  <CardContent className="pt-6 grid gap-6 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Thermometer className="w-3 h-3" /> Temp (°C)</Label>
                      <Input type="number" step="0.1" {...register("vitalSigns.temperature")} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Activity className="w-3 h-3" /> Blood Pressure</Label>
                      <Input placeholder="120/80" {...register("vitalSigns.bloodPressure")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pulse Rate (bpm)</Label>
                      <Input type="number" {...register("vitalSigns.pulseRate")} />
                    </div>
                    <div className="space-y-2">
                      <Label>O2 Saturation (%)</Label>
                      <Input type="number" {...register("vitalSigns.oxygenSaturation")} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Scale className="w-3 h-3" /> Weight (kg)</Label>
                      <Input type="number" step="0.1" {...register("vitalSigns.weight")} />
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" className="h-12 px-8" onClick={() => setSelectedPatient(null)}>Cancel Encounter</Button>
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
