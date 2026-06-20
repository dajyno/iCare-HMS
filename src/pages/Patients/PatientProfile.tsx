import { useState, useEffect, useMemo, useRef } from "react";
import type * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { generateInvoiceNumber } from "@/src/lib/invoiceNumber";
import { useAuth } from "@/src/context/AuthContext";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Edit, Save,
  Stethoscope, FlaskConical, Pill, Activity, AlertCircle, Loader2,
  BadgeCheck, FolderOpen, Users, Building, Shield, Clock, Plus,
  HeartPulse, Microscope, Receipt, Bone, Thermometer, Scale, Droplets, Ruler,
  X, Edit3, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import ConsultationDetailCard from "@/src/components/ConsultationDetailCard";
import { ProfileSkeleton } from "@/src/components/skeletons/ProfileSkeleton";
import { toast } from "sonner";

const categoryBadge: Record<string, string> = {
  Individual: "bg-blue-50 text-blue-700", Family: "bg-emerald-50 text-emerald-700",
  Corporate: "bg-purple-50 text-purple-700", HMO: "bg-amber-50 text-amber-700",
};

const PatientProfile = () => {
  const { id, hospital_slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Overlay states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<any>({});
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultForm, setConsultForm] = useState<any>({});
  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState<any>({});
  const [showRadModal, setShowRadModal] = useState(false);
  const [radForm, setRadForm] = useState<any>({});
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState<any>({});
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState<any>({});
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedLabResult, setSelectedLabResult] = useState<any>(null);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [hmoSuggestions, setHmoSuggestions] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("patients").select("company_name").not("company_name", "is", null).then(({ data }) => {
      const names = [...new Set((data || []).map((r: any) => r.company_name).filter(Boolean))];
      setCompanySuggestions(names);
    });
    supabase.from("patients").select("insurance_provider").not("insurance_provider", "is", null).then(({ data }) => {
      const names = [...new Set((data || []).map((r: any) => r.insurance_provider).filter(Boolean))];
      setHmoSuggestions(names);
    });
  }, []);

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

  const { data: consultations } = useQuery({
    queryKey: ["patient-consultations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*, vital_signs(*)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

  const { data: consultationDoctors } = useQuery({
    queryKey: ["consultation-doctors", consultations],
    queryFn: async () => {
      if (!Array.isArray(consultations) || consultations.length === 0) return [];
      const doctorIds = [...new Set(consultations.map((c: any) => c.doctorId).filter(Boolean))];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", doctorIds);
      if (error) throw error;
      return toCamel(data);
    },
    enabled: Array.isArray(consultations) && consultations.length > 0,
  });

  const doctorMap = useMemo(() => {
    if (!Array.isArray(consultationDoctors)) return new Map();
    return new Map(consultationDoctors.map((u: any) => [u.id, u]));
  }, [consultationDoctors]);

  const enrichedConsultations = useMemo(() => {
    if (!Array.isArray(consultations)) return [];
    return consultations.map((c: any) => ({
      ...c,
      doctor: doctorMap.get(c.doctorId) || null,
    }));
  }, [consultations, doctorMap]);

  const { data: labRequests } = useQuery({
    queryKey: ["patient-labs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, test:lab_tests(name, category), results:lab_results(*)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

  const { data: radiologyRequestsData } = useQuery({
    queryKey: ["patient-radiology-requests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_requests")
        .select("*, exam:radiology_exams(*, category:radiology_categories(name)), result:radiology_results(*)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ["patient-rx", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, items:prescription_items(*, medication:medications(name, strength))")
        .eq("patient_id", id)
        .order("date", { ascending: false });
      if (error) {
        console.error("Prescriptions query error:", error);
        throw error;
      }
      return toCamel(data);
    },
    enabled: !!id,
  });

  const labByConsultation = useMemo(() => {
    if (!Array.isArray(labRequests)) return new Map();
    const m = new Map<string, any[]>();
    for (const lr of labRequests) {
      const cId = lr.consultationId || lr.consultation_id;
      if (cId) { if (!m.has(cId)) m.set(cId, []); m.get(cId)!.push(lr); }
    }
    return m;
  }, [labRequests]);

  const rxByConsultation = useMemo(() => {
    if (!Array.isArray(prescriptions)) return new Map();
    const m = new Map<string, any[]>();
    for (const rx of prescriptions) {
      const cId = rx.consultationId || rx.consultation_id;
      if (cId) { if (!m.has(cId)) m.set(cId, []); m.get(cId)!.push(rx); }
    }
    return m;
  }, [prescriptions]);

  const radByConsultation = useMemo(() => {
    if (!Array.isArray(radiologyRequestsData)) return new Map();
    const m = new Map<string, any[]>();
    for (const rr of radiologyRequestsData) {
      const cId = rr.consultationId || rr.consultation_id;
      if (cId) { if (!m.has(cId)) m.set(cId, []); m.get(cId)!.push(rr); }
    }
    return m;
  }, [radiologyRequestsData]);

  const { data: vitals } = useQuery({
    queryKey: ["patient-vitals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("id, created_at, vital_signs(*)")
        .eq("patient_id", id)
        .not("vital_signs", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(
        (data || []).map((c: any) => ({
          ...(c.vital_signs || {}),
          consultation: { id: c.id, created_at: c.created_at },
        }))
      );
    },
    enabled: !!id,
  });

  const { data: invoices } = useQuery({
    queryKey: ["patient-invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

  const { data: familyMembers } = useQuery({
    queryKey: ["patient-family-group", patient?.id],
    queryFn: async () => {
      const fields = "id, patient_id, first_name, last_name, phone, gender, is_primary, family_id, relationship";
      const { data, error } = await supabase
        .from("patients")
        .select(fields)
        .eq("family_id", patient.id)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!patient,
  });

  const { data: primaryPatient } = useQuery({
    queryKey: ["patient-primary", patient?.familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .eq("id", patient.familyId)
        .single();
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!patient?.familyId,
  });

  const { data: labTests } = useQuery({
    queryKey: ["lab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .order("name");
      if (error) throw error;
      return toCamel(data);
    },
    enabled: showLabModal || showRadModal,
  });

  const { data: medications } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("name");
      if (error) throw error;
      return toCamel(data);
    },
    enabled: showRxModal,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("patients").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Patient updated successfully");
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowEditModal(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.details || "Failed to update patient");
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const updateProfilePicture = useMutation({
    mutationFn: async (base64: string) => {
      setUploadingPic(true);
      const { error } = await supabase.from("patients").update({ profile_picture: base64 }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, base64) => {
      queryClient.setQueryData(["patient", id], (old: any) => {
        if (!old) return old;
        return { ...old, profilePicture: base64 };
      });
      toast.success("Profile picture updated successfully");
      setUploadingPic(false);
    },
    onError: (err: Error) => {
      setUploadingPic(false);
      toast.error(`Failed to update profile picture: ${err.message}`);
    },
  });

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfilePicture.mutate(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const createConsultation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("consultations").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Consultation created successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-consultations", id] });
      setShowConsultModal(false);
      setConsultForm({});
    },
    onError: (err: Error) => {
      toast.error(`Failed to create consultation: ${err.message}`);
    },
  });

  const createVitals = useMutation({
    mutationFn: async (payload: any) => {
      const { data: consult, error: consultError } = await supabase
        .from("consultations")
        .insert({ patient_id: id, doctor_id: currentUser?.id, chief_complaint: "Vitals Check", status: "VitalsRecorded" })
        .select()
        .single();
      if (consultError) throw consultError;
      const { error: vitalsError } = await supabase
        .from("vital_signs")
        .insert({ ...payload, consultation_id: consult.id });
      if (vitalsError) throw vitalsError;
    },
    onSuccess: () => {
      toast.success("Vital signs saved successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-vitals", id] });
      queryClient.invalidateQueries({ queryKey: ["patient-consultations", id] });
      setShowVitalsModal(false);
      setVitalsForm({});
    },
    onError: (err: Error) => {
      if (err.message?.includes("foreign key") || err.message?.includes("violates")) {
        toast.error("Database constraint error: Your user profile needs to be set up. Please run the updated supabase-schema.sql in your Supabase SQL Editor to fix FK constraints.");
      } else {
        toast.error(`Failed to save vital signs: ${err.message}`);
      }
    },
  });

  const createLabRequest = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("lab_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lab request created successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-labs", id] });
      setShowLabModal(false);
      setLabForm({});
    },
    onError: (err: Error) => {
      toast.error(`Failed to create lab request: ${err.message}`);
    },
  });

  const createRadRequest = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("radiology_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Radiology request created successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-radiology-requests", id] });
      setShowRadModal(false);
      setRadForm({});
    },
    onError: (err: Error) => {
      toast.error(`Failed to create radiology request: ${err.message}`);
    },
  });

  const createPrescription = useMutation({
    mutationFn: async (payload: any) => {
      const { items, ...prescription } = payload;
      const { data: rx, error: rxError } = await supabase
        .from("prescriptions")
        .insert(prescription)
        .select()
        .single();
      if (rxError) throw rxError;
      if (items && items.length > 0) {
        const { error: itemError } = await supabase
          .from("prescription_items")
          .insert(items.map((i: any) => ({ ...i, prescription_id: rx.id })));
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      toast.success("Prescription created successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-rx", id] });
      setShowRxModal(false);
      setRxForm({});
    },
    onError: (err: Error) => {
      toast.error(`Failed to create prescription: ${err.message}`);
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (payload: any) => {
      const { items, ...invoice } = payload;
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .insert(invoice)
        .select()
        .single();
      if (invError) throw invError;
      if (inv && items && items.length > 0) {
        const { error: itemError } = await supabase
          .from("invoice_items")
          .insert(items.map((i: any) => ({ ...i, invoice_id: inv.id })));
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      toast.success("Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-invoices", id] });
      setShowBillModal(false);
      setBillForm({});
      navigate("/billing");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create invoice: ${err.message}`);
    },
  });

  const [showDependantModal, setShowDependantModal] = useState(false);
  const [dependantForm, setDependantForm] = useState({
    firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "", relationship: "",
  });

  const RELATIONSHIP_OPTIONS = [
    "Wife", "Son", "Daughter", "Mother", "Father", "Brother", "Sister",
    "Uncle", "Aunt", "Cousin", "Grandfather", "Grandmother", "Grandson", "Granddaughter",
    "Nephew", "Niece", "Friend", "Ward", "Spouse", "Partner",
    "Others",
  ];

  const createDependant = useMutation({
    mutationFn: async (formData: typeof dependantForm) => {
      const folderBase = (formData.lastName || "DEP").toUpperCase().replace(/[^A-Z]/g, "").substring(0, 6);
      const { data: existing } = await supabase
        .from("patients")
        .select("patient_id")
        .like("patient_id", `${folderBase}-%`)
        .order("patient_id", { ascending: false })
        .limit(1);
      const lastNum = existing?.[0]?.patient_id
        ? parseInt(String(existing[0].patient_id).split("-").pop() || "0", 10)
        : 0;
      const newPatientId = `${folderBase}-${String(lastNum + 1).padStart(3, "0")}`;

      // If this patient is not a Family folder, upgrade it to Family first
      if (patient.category === "Individual") {
        const { error: upgradeError } = await supabase
          .from("patients")
          .update({ category: "Family", is_primary: true })
          .eq("id", id);
        if (upgradeError) throw upgradeError;
      } else if (patient.category === "Corporate" || patient.category === "HMO") {
        const { error: upgradeError } = await supabase
          .from("patients")
          .update({ is_primary: true })
          .eq("id", id);
        if (upgradeError) throw upgradeError;
      }

      const { data, error } = await supabase
        .from("patients")
        .insert({
          patient_id: newPatientId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth,
          blood_group: formData.bloodGroup || null,
          relationship: formData.relationship || null,
          category: patient.category === "Individual" ? "Family" : patient.category,
          family_id: id,
          is_primary: false,
          status: "active",
          phone: "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newDependant: any) => {
      const dependant = toCamel(newDependant);
      toast.success("Dependant created successfully");
      queryClient.setQueryData(["patients"], (old: any) => Array.isArray(old) ? [...old, dependant] : [dependant]);
      queryClient.setQueryData(["patient", id], (old: any) => old ? { ...old, category: old.category === "Individual" ? "Family" : old.category, isPrimary: true } : old);
      queryClient.setQueryData(["patient-family-group", patient?.id], (old: any) => Array.isArray(old) ? [...old, dependant] : [dependant]);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-family-group", patient?.id] });
      queryClient.invalidateQueries({ queryKey: ["patients-family-groups"] });
      queryClient.invalidateQueries({ queryKey: ["patients-dependant-counts"] });
      queryClient.invalidateQueries({ queryKey: ["patients-family-primaries"] });
      queryClient.invalidateQueries({ queryKey: ["patients-family-primaries-list"] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setShowDependantModal(false);
      setDependantForm({ firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "", relationship: "" });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create dependant: ${err.message}`);
    },
  });

  const handleDependantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDependant.mutate(dependantForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _, patientId, createdAt, registrationDate, ...rest } = editForm;
    const payload: any = {};
    const category = editForm.category;
    for (const [key, val] of Object.entries(rest)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (category !== "Corporate" && ["companyName", "companyPhone", "companyAddress"].includes(key)) continue;
      if (category !== "HMO" && ["insuranceProvider", "insuranceId"].includes(key)) continue;
      payload[dbKey] = typeof val === "boolean" ? val : (val || null);
    }
    updateMutation.mutate(payload);
  };

  const openEdit = () => {
    if (patient) {
      setEditForm({ ...patient, dateOfBirth: patient.dateOfBirth?.substring(0, 10) || "" });
      setShowEditModal(true);
    }
  };

  const handleVitalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const heightM = (vitalsForm.height || 0) / 100;
    const bmi = vitalsForm.weight && heightM ? (vitalsForm.weight / (heightM * heightM)).toFixed(1) : null;
    createVitals.mutate({
      temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : null,
      blood_pressure: vitalsForm.bloodPressure || null,
      pulse_rate: vitalsForm.pulseRate ? parseInt(vitalsForm.pulseRate) : null,
      respiratory_rate: vitalsForm.respiratoryRate ? parseInt(vitalsForm.respiratoryRate) : null,
      weight: vitalsForm.weight ? parseFloat(vitalsForm.weight) : null,
      height: vitalsForm.height ? parseFloat(vitalsForm.height) : null,
      bmi: bmi ? parseFloat(bmi) : null,
      oxygen_saturation: vitalsForm.oxygenSaturation ? parseInt(vitalsForm.oxygenSaturation) : null,
    });
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createConsultation.mutate({
      patient_id: id,
      doctor_id: currentUser?.id,
      status: "InProgress",
      chief_complaint: consultForm.chiefComplaint,
      symptoms: consultForm.symptoms || null,
      diagnosis: consultForm.diagnosis || null,
      clinical_notes: consultForm.clinicalNotes || null,
      treatment_plan: consultForm.treatmentPlan || null,
      follow_up_date: consultForm.followUpDate || null,
    });
  };

  const handleLabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLabRequest.mutate({
      patient_id: id,
      test_id: labForm.testId,
      status: "Requested",
    });
  };

  const handleRadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRadRequest.mutate({
      patient_id: id,
      test_id: radForm.testId,
      status: "Requested",
    });
  };

  const handleRxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPrescription.mutate({
      patient_id: id,
      doctor_id: currentUser?.id,
      status: "Pending",
      items: [{
        medication_id: rxForm.medicationId,
        dosage: rxForm.dosage,
        frequency: rxForm.frequency,
        duration: rxForm.duration,
        instructions: rxForm.instructions || null,
      }],
    });
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(billForm.quantity) || 1;
    const unitPrice = parseFloat(billForm.unitPrice) || 0;
    const total = qty * unitPrice;
    const invNum = await generateInvoiceNumber(supabase);
    createInvoice.mutate({
      patient_id: id,
      invoice_number: invNum,
      total_amount: total,
      amount_paid: 0,
      balance: total,
      status: "Unpaid",
      items: [{ description: billForm.description, quantity: qty, unit_price: unitPrice, total }],
    });
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !patient) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p>Patient not found</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(`/${hospital_slug}/patients`)}>Back to Patients</Button>
    </div>
  );

  const radiologyFromLab = Array.isArray(labRequests)
    ? labRequests.filter((lr: any) => lr.test?.category === "Radiology")
    : [];

  const radiologyFromRad = Array.isArray(radiologyRequestsData)
    ? radiologyRequestsData.map((rr: any) => ({
        id: rr.id,
        status: rr.status,
        createdAt: rr.createdAt,
        test: rr.exam ? { name: rr.exam.name, category: rr.exam.category?.name } : null,
        results: rr.result ? { resultValue: rr.result.findings, unit: "", interpretation: rr.result.conclusion } : null,
        _source: "radiology_requests",
      }))
    : [];

  const radiologyRequests = [...radiologyFromRad, ...radiologyFromLab];

  const regularLabs = Array.isArray(labRequests)
    ? labRequests.filter((lr: any) => lr.test?.category !== "Radiology")
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/${hospital_slug}/patients`)} className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">Patient Profile</h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">{patient.patientId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowDependantModal(true)} className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border-slate-200 justify-center" aria-label="Add Dependant">
            <Users className="w-4 h-4 mr-2" />
            <span className="inline">Add Dependant</span>
          </Button>
          <Button onClick={openEdit} className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 justify-center" aria-label="Edit Profile">
            <Edit className="w-4 h-4 mr-2" />
            <span className="inline">Edit</span>
          </Button>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative shrink-0 group">
              {patient.profilePicture ? (
                <img src={patient.profilePicture} alt={`${patient.firstName} ${patient.lastName}`} className="w-20 h-20 rounded-full object-cover shadow-md cursor-pointer" onClick={() => fileInputRef.current?.click()} />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-md cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {patient.firstName?.[0]}{patient.lastName?.[0]}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {uploadingPic ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h2>
                <Badge variant="outline" className={`font-bold ${categoryBadge[patient.category] || ""}`}>{patient.category}</Badge>
                <Badge className={patient.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                  {patient.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2 text-slate-500"><Phone className="w-3.5 h-3.5" />{patient.phone}</div>
                <div className="flex items-center gap-2 text-slate-500"><Mail className="w-3.5 h-3.5" />{patient.email || "N/A"}</div>
                <div className="flex items-center gap-2 text-slate-500"><Calendar className="w-3.5 h-3.5" />{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A"}</div>
                <div className="flex items-center gap-2 text-slate-500"><MapPin className="w-3.5 h-3.5" />{patient.address || "N/A"}</div>
                <div className="flex items-center gap-2 text-slate-500"><Users className="w-3.5 h-3.5" />{patient.gender}</div>
                <div className="flex items-center gap-2 text-slate-500"><FolderOpen className="w-3.5 h-3.5" />{patient.patientId}</div>
              </div>
            </div>
          </div>

          {(patient.nextOfKinName || patient.companyName) && (
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {patient.nextOfKinName && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Next of Kin</span>
                  <p className="text-slate-700 mt-1">{patient.nextOfKinName} {patient.nextOfKinRelation ? `(${patient.nextOfKinRelation})` : ""}</p>
                  {patient.nextOfKinPhone && <p className="text-slate-500 text-xs">{patient.nextOfKinPhone}</p>}
                </div>
              )}
              {patient.companyName && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Company</span>
                  <p className="text-slate-700 mt-1">{patient.companyName}</p>
                  {patient.companyPhone && <p className="text-slate-500 text-xs">{patient.companyPhone}</p>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ height: 'auto' }} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-2 w-full bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <TabsTrigger value="overview" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><Activity className="size-3.5 sm:size-4" /> Overview</TabsTrigger>
          <TabsTrigger value="vitals" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><HeartPulse className="size-3.5 sm:size-4" /> Vital Signs</TabsTrigger>
          <TabsTrigger value="consultations" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><Stethoscope className="size-3.5 sm:size-4" /> Consultations</TabsTrigger>
          <TabsTrigger value="labs" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><FlaskConical className="size-3.5 sm:size-4" /> Lab Results</TabsTrigger>
          <TabsTrigger value="radiology" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><Bone className="size-3.5 sm:size-4" /> Radiology</TabsTrigger>
          <TabsTrigger value="prescriptions" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><Pill className="size-3.5 sm:size-4" /> Prescriptions</TabsTrigger>
          <TabsTrigger value="billing" className="text-center py-2 px-1 text-[11px] sm:text-xs font-medium rounded-lg border transition-all whitespace-normal data-active:bg-white data-active:text-blue-600 data-active:border-slate-200 data-active:shadow-sm data-active:font-semibold text-slate-600 border-transparent hover:text-slate-900"><Receipt className="size-3.5 sm:size-4" /> Billing</TabsTrigger>
        </TabsList>

        {/* ========== OVERVIEW ========== */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><FolderOpen className="w-4 h-4 text-blue-500" /> Folder Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Folder Type</span>
                <p className="mt-1">
                  <Badge variant="outline" className={`font-bold mt-0.5 ${categoryBadge[patient.category] || ""}`}>{patient.category}</Badge>
                </p>
              </div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Folder No.</span><p className="font-semibold mt-1 font-mono">{patient.patientId}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Status</span><p className="mt-1"><Badge className={patient.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>{patient.status === "active" ? "Active" : "Inactive"}</Badge></p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Registered</span><p className="font-semibold mt-1">{patient.registrationDate ? new Date(patient.registrationDate).toLocaleDateString() : "N/A"}</p></div>
            </CardContent>

            {(patient.companyName || patient.insuranceProvider) && (
              <CardContent className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {patient.companyName && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Company</span>
                    <p className="font-semibold mt-1">{patient.companyName}</p>
                    {patient.companyPhone && <p className="text-xs text-slate-500">{patient.companyPhone}</p>}
                  </div>
                )}
                {patient.insuranceProvider && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">HMO / Insurance</span>
                    <p className="font-semibold mt-1">{patient.insuranceProvider}</p>
                    {patient.insuranceId && <p className="text-xs text-slate-500">ID: {patient.insuranceId}</p>}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Medical Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Blood Group</span><p className="font-semibold mt-1">{patient.bloodGroup || "N/A"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Allergies</span><p className="font-semibold mt-1">{patient.allergies || "None"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Medical History</span><p className="font-semibold mt-1">{patient.medicalHistory || "None"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Emergency Contact</span><p className="font-semibold mt-1">{patient.emergencyContact || "N/A"}</p></div>
            </CardContent>
          </Card>

          {/* Primary Patient (shown when this patient is a dependant) */}
          {primaryPatient && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200">
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Primary Patient</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
                      {primaryPatient.firstName?.[0]}{primaryPatient.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{primaryPatient.firstName} {primaryPatient.lastName}</p>
                      <p className="text-xs text-slate-400">{primaryPatient.patientId}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-bold"
                    onClick={() => navigate(`/${hospital_slug}/patients/${primaryPatient.id}`)}>
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dependants */}
          {Array.isArray(familyMembers) && familyMembers.length > 0 && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200">
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Dependants</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {familyMembers.map((fm: any) => (
                  <div key={fm.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white">
                        {fm.firstName?.[0]}{fm.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{fm.firstName} {fm.lastName}</p>
                        <p className="text-xs text-slate-400">{fm.patientId} {fm.relationship ? `• ${fm.relationship}` : ""}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-bold"
                      onClick={() => navigate(`/${hospital_slug}/patients/${fm.id}`)}>
                      View Profile
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== VITAL SIGNS ========== */}
        <TabsContent value="vitals" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => navigate(`/${hospital_slug}/consultations/vitals?patientId=${id}`)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Record Vital Signs
            </Button>
          </div>
          {!Array.isArray(vitals) || vitals.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No vital signs recorded.</div>
          ) : (
            vitals.map((v: any) => (
                <Card key={v.id} className="border-none shadow-sm ring-1 ring-slate-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-rose-500" /><span className="font-bold text-slate-900">Vital Signs</span></div>
                      <span className="text-xs text-slate-400">{v.consultation?.createdAt ? new Date(v.consultation.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {v.temperature != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">Temp</span><p className="font-semibold mt-0.5">{v.temperature} °C</p></div>}
                      {v.bloodPressure && <div><span className="text-[10px] font-bold uppercase text-slate-400">BP</span><p className="font-semibold mt-0.5">{v.bloodPressure} mmHg</p></div>}
                      {v.pulseRate != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">Pulse</span><p className="font-semibold mt-0.5">{v.pulseRate} bpm</p></div>}
                      {v.respiratoryRate != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">RR</span><p className="font-semibold mt-0.5">{v.respiratoryRate} /min</p></div>}
                      {v.weight != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">Weight</span><p className="font-semibold mt-0.5">{v.weight} kg</p></div>}
                      {v.height != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">Height</span><p className="font-semibold mt-0.5">{v.height} cm</p></div>}
                      {v.bmi != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">BMI</span><p className="font-semibold mt-0.5">{v.bmi}</p></div>}
                      {v.oxygenSaturation != null && <div><span className="text-[10px] font-bold uppercase text-slate-400">SpO₂</span><p className="font-semibold mt-0.5">{v.oxygenSaturation}%</p></div>}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        {/* ========== CONSULTATIONS ========== */}
        <TabsContent value="consultations" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowConsultModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Consultation
            </Button>
          </div>

          {!Array.isArray(enrichedConsultations) || enrichedConsultations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No consultation records found.</div>
          ) : (
            enrichedConsultations.map((c: any) => (
              <ConsultationDetailCard
                key={c.id}
                consultation={c}
                prescriptions={rxByConsultation.get(c.id) || []}
                labRequests={labByConsultation.get(c.id) || []}
                radiologyRequests={radByConsultation.get(c.id) || []}
              />
            ))
          )}
        </TabsContent>

        {/* ========== LAB RESULTS ========== */}
        <TabsContent value="labs" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => navigate(`/${hospital_slug}/laboratory?patientId=${id}&view=newExam`)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Lab Request
            </Button>
          </div>
          {regularLabs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No lab records found.</div>
          ) : (
            regularLabs.map((lr: any) => (
              <Card
                key={lr.id}
                className={`border-none shadow-sm ring-1 ring-slate-200 ${lr.results ? "cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all" : ""}`}
                onClick={() => { if (lr.results) setSelectedLabResult(lr); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-amber-500" /><span className="font-bold text-slate-900">{lr.test?.name || "Unknown Test"}</span></div>
                      <Badge variant="outline" className="mt-2 text-[10px]">{lr.status}</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{lr.createdAt ? new Date(lr.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                  {lr.results && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                      <span className="font-semibold text-slate-700">Result: </span>{lr.results.resultValue} {lr.results.unit || ""}
                      {lr.results.interpretation && <p className="text-xs text-slate-500 mt-1">{lr.results.interpretation}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ========== RADIOLOGY ========== */}
        <TabsContent value="radiology" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => navigate(`/${hospital_slug}/radiology?patientId=${id}&view=newExam`)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Radiology Request
            </Button>
          </div>
          {radiologyRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No radiology records found.</div>
          ) : (
            radiologyRequests.map((lr: any) => (
              <Card key={lr.id} className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2"><Bone className="w-4 h-4 text-indigo-500" /><span className="font-bold text-slate-900">{lr.test?.name || "Unknown"}</span>
                        {lr._source === "radiology_requests" && <span className="text-[10px] text-slate-400 font-normal">(Radiology)</span>}
                      </div>
                      <Badge variant="outline" className="mt-2 text-[10px]">{lr.status}</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{lr.createdAt ? new Date(lr.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                  {lr.results && lr.results.resultValue && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                      <span className="font-semibold text-slate-700">Findings: </span>{lr.results.resultValue}
                      {lr.results.interpretation && <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Conclusion:</span> {lr.results.interpretation}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ========== PRESCRIPTIONS ========== */}
        <TabsContent value="prescriptions" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => navigate(`/${hospital_slug}/pharmacy/prescriptions?patientId=${id}`)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Prescription
            </Button>
          </div>
          {!Array.isArray(prescriptions) || prescriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No prescriptions found.</div>
          ) : (
            prescriptions.map((rx: any) => (
              <Card key={rx.id} className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2"><Pill className="w-4 h-4 text-emerald-500" /><span className="font-bold text-slate-900">Prescription</span></div>
                    <Badge variant="outline" className="text-[10px]">{rx.status}</Badge>
                  </div>
                    <p className="text-xs text-slate-500 mt-1">{rx.date ? new Date(rx.date).toLocaleDateString() : ""}</p>
                  {Array.isArray(rx.items) && rx.items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {rx.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                          <span className="font-medium text-slate-700">{item.medication?.name || "Unknown"} {item.medication?.strength || ""}</span>
                          <span className="text-slate-500 text-xs">{item.dosage} — {item.frequency} for {item.duration}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ========== BILLING ========== */}
        <TabsContent value="billing" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowBillModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          </div>
          {!Array.isArray(invoices) || invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No billing records found.</div>
          ) : (
            invoices.map((inv: any) => (
              <Card key={inv.id} className="border-none shadow-sm ring-1 ring-slate-200 cursor-pointer hover:ring-sky-300 hover:shadow-md transition-all" onClick={() => setSelectedInvoice(inv)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500" /><span className="font-bold text-slate-900">{inv.invoiceNumber}</span></div>
                      <Badge variant="outline" className={`mt-2 text-[10px] ${
                        inv.status === "Paid" ? "bg-emerald-50 text-emerald-700" :
                        inv.status === "PartiallyPaid" ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>{inv.status}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">₦{inv.totalAmount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                  </div>
                  {Array.isArray(inv.items) && inv.items.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-1">
                      {inv.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm text-slate-600">
                          <span>{item.description} x{item.quantity}</span>
                          <span>₦{item.total?.toLocaleString()}</span>
                        </div>
                      ))}
                      {inv.items.length > 3 && (
                        <p className="text-xs text-slate-400 text-center pt-1">+{inv.items.length - 3} more items — click to view all</p>
                      )}
                    </div>
                  )}
                  {inv.status !== "Paid" && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Paid: ₦{inv.amountPaid?.toLocaleString() || 0}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-red-600 font-semibold">Balance: ₦{inv.balance?.toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ========== INVOICE DETAIL DIALOG ========== */}
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                {selectedInvoice?.invoiceNumber || "Invoice"}
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice?.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString() : ""}
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs font-bold uppercase tracking-wider ${
                    selectedInvoice.status === "Paid" ? "bg-emerald-50 text-emerald-700" :
                    selectedInvoice.status === "PartiallyPaid" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                  }`}>{selectedInvoice.status}</Badge>
                  <span className="text-lg font-extrabold text-slate-900">₦{selectedInvoice.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="border rounded-lg divide-y divide-slate-100">
                  <div className="px-4 py-2 bg-slate-50 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Item</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {Array.isArray(selectedInvoice.items) && selectedInvoice.items.map((item: any, i: number) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{item.description || "Item"}</p>
                        <p className="text-xs text-slate-400">Qty: {item.quantity} × ₦{item.unitPrice?.toLocaleString() || 0}</p>
                      </div>
                      <span className="font-semibold text-slate-900">₦{item.total?.toLocaleString() || 0}</span>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-between bg-slate-50 text-sm font-bold">
                    <span>Subtotal</span>
                    <span>₦{selectedInvoice.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Amount Paid</p>
                    <p className="text-lg font-bold text-emerald-600">₦{selectedInvoice.amountPaid?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Balance</p>
                    <p className="text-lg font-bold text-red-600">₦{selectedInvoice.balance?.toLocaleString() || "0"}</p>
                  </div>
                </div>

                {selectedInvoice.sourceType && (
                  <div className="text-sm text-slate-500">
                    <span className="font-medium">Source: </span>{selectedInvoice.sourceType}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* ======== EDIT MODAL ======== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden p-0 gap-0">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
            <DialogTitle className="text-base font-bold">Edit Patient</DialogTitle>
            <DialogClose className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-xs text-slate-500">Folder number cannot be changed. Fields from other categories will be cleared on save.</p>
            <form id="edit-patient-form" onSubmit={handleEditSubmit} className="space-y-5">
              {/* 2-col grid for paired fields */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-x-6 gap-y-4">
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Folder No.</Label>
                  <Input value={editForm.patientId || ""} disabled className="w-full bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed rounded-xl px-3.5 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Status</Label>
                  <SearchableSelect value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })} options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">First Name <span className="text-red-500">*</span></Label>
                  <Input required value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Last Name <span className="text-red-500">*</span></Label>
                  <Input required value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Gender</Label>
                  <SearchableSelect value={editForm.gender || ""} onValueChange={(v) => setEditForm({ ...editForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Blood Group</Label>
                  <SearchableSelect value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Date of Birth</Label>
                  <Input type="date" value={editForm.dateOfBirth || ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Category <span className="text-red-500">*</span></Label>
                  <SearchableSelect value={editForm.category || "Individual"} onValueChange={(v) => setEditForm({ ...editForm, category: v })} options={[{value:"Individual",label:"Individual"},{value:"Family",label:"Family"},{value:"Corporate",label:"Corporate"},{value:"HMO",label:"HMO"}]} triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Phone</Label>
                  <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div></div>
              </div>

              {/* Full-width fields */}
              <div className="space-y-4">
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Email</Label>
                  <Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Address</Label>
                  <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Allergies / Medical History</Label>
                  <Textarea value={editForm.allergies || ""} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[80px]" />
                </div>
              </div>

              {editForm.category === "Corporate" && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Company Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Company Name</Label>
                      <SearchableSelect value={editForm.companyName || ""} onValueChange={(v) => setEditForm({ ...editForm, companyName: v })} placeholder="Search or type company name..." options={companySuggestions.map((name) => ({value: name, label: name}))} creatable triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                    </div>
                    <div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Company Phone</Label>
                      <Input value={editForm.companyPhone || ""} onChange={(e) => setEditForm({ ...editForm, companyPhone: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                    <div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Company Address</Label>
                      <Input value={editForm.companyAddress || ""} onChange={(e) => setEditForm({ ...editForm, companyAddress: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {editForm.category === "HMO" && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Insurance / HMO Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">HMO Provider</Label>
                      <SearchableSelect value={editForm.insuranceProvider || ""} onValueChange={(v) => setEditForm({ ...editForm, insuranceProvider: v })} placeholder="Search or type HMO provider..." options={hmoSuggestions.map((name) => ({value: name, label: name}))} creatable triggerClassName="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-left justify-start font-normal h-auto" />
                    </div>
                    <div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1 tracking-wide">Insurance ID / Registration Number</Label>
                      <Input value={editForm.insuranceId || ""} onChange={(e) => setEditForm({ ...editForm, insuranceId: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-md px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 z-10">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" form="edit-patient-form" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-100 transition-colors" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======== VITAL SIGNS MODAL ======== */}
      <Dialog open={showVitalsModal} onOpenChange={setShowVitalsModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>Enter the patient's vital signs measurements.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVitalsSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temp (°C)</Label>
                <Input type="number" step="0.1" value={vitalsForm.temperature || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Activity className="w-3 h-3" /> BP (mmHg)</Label>
                <Input placeholder="120/80" value={vitalsForm.bloodPressure || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><HeartPulse className="w-3 h-3 inline mr-1" /> Pulse (bpm)</Label>
                <Input type="number" value={vitalsForm.pulseRate || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Activity className="w-3 h-3 inline mr-1" /> RR (/min)</Label>
                <Input type="number" value={vitalsForm.respiratoryRate || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Droplets className="w-3 h-3 inline mr-1" /> SpO2 (%)</Label>
                <Input type="number" value={vitalsForm.oxygenSaturation || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Scale className="w-3 h-3 inline mr-1" /> Weight (kg)</Label>
                <Input type="number" step="0.1" value={vitalsForm.weight || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label><Ruler className="w-3 h-3 inline mr-1" /> Height (cm)</Label>
                <Input type="number" step="0.1" value={vitalsForm.height || ""} onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVitalsModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createVitals.isPending}>
                {createVitals.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== CONSULTATION MODAL ======== */}
      <Dialog open={showConsultModal} onOpenChange={setShowConsultModal}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Consultation</DialogTitle>
            <DialogDescription>Record a new consultation for this patient.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConsultSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Chief Complaint *</Label><Textarea required value={consultForm.chiefComplaint || ""} onChange={(e) => setConsultForm({ ...consultForm, chiefComplaint: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Symptoms</Label><Textarea value={consultForm.symptoms || ""} onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Diagnosis</Label><Textarea value={consultForm.diagnosis || ""} onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Clinical Notes</Label><Textarea value={consultForm.clinicalNotes || ""} onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Treatment Plan</Label><Textarea value={consultForm.treatmentPlan || ""} onChange={(e) => setConsultForm({ ...consultForm, treatmentPlan: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Follow-up Date</Label><Input type="date" value={consultForm.followUpDate || ""} onChange={(e) => setConsultForm({ ...consultForm, followUpDate: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowConsultModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createConsultation.isPending}>
                {createConsultation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== LAB REQUEST MODAL ======== */}
      <Dialog open={showLabModal} onOpenChange={setShowLabModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>New Lab Request</DialogTitle>
            <DialogDescription>Select a lab test to request.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLabSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lab Test *</Label>
              <SearchableSelect value={labForm.testId || ""} onValueChange={(v) => setLabForm({ ...labForm, testId: v })} placeholder="Select test" options={(Array.isArray(labTests) ? labTests.filter((t: any) => t.category !== "Radiology") : []).map((t: any) => ({value: t.id, label: t.name}))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLabModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createLabRequest.isPending}>
                {createLabRequest.isPending ? "Saving..." : "Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== RADIOLOGY REQUEST MODAL ======== */}
      <Dialog open={showRadModal} onOpenChange={setShowRadModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>New Radiology Request</DialogTitle>
            <DialogDescription>Select an imaging test to request.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRadSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Radiology Test *</Label>
              <SearchableSelect value={radForm.testId || ""} onValueChange={(v) => setRadForm({ ...radForm, testId: v })} placeholder="Select test" options={(Array.isArray(labTests) ? labTests.filter((t: any) => t.category === "Radiology") : []).map((t: any) => ({value: t.id, label: t.name}))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRadModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createRadRequest.isPending}>
                {createRadRequest.isPending ? "Saving..." : "Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== PRESCRIPTION MODAL ======== */}
      <Dialog open={showRxModal} onOpenChange={setShowRxModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
            <DialogDescription>Add a medication prescription.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRxSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Medication *</Label>
              <SearchableSelect value={rxForm.medicationId || ""} onValueChange={(v) => setRxForm({ ...rxForm, medicationId: v })} placeholder="Select medication" options={(Array.isArray(medications) ? medications : []).map((m: any) => ({value: m.id, label: `${m.name} ${m.strength || ""}`.trim()}))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>Dosage *</Label><Input required placeholder="e.g. 500mg" value={rxForm.dosage || ""} onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Frequency *</Label><Input required placeholder="e.g. 3x/day" value={rxForm.frequency || ""} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Duration *</Label><Input required placeholder="e.g. 7 days" value={rxForm.duration || ""} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Instructions</Label><Textarea value={rxForm.instructions || ""} onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRxModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createPrescription.isPending}>
                {createPrescription.isPending ? "Saving..." : "Prescribe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== BILLING MODAL ======== */}
      <Dialog open={showBillModal} onOpenChange={setShowBillModal}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for this patient.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBillSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Description *</Label><Input required placeholder="e.g. Consultation fee" value={billForm.description || ""} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min="1" value={billForm.quantity || "1"} onChange={(e) => setBillForm({ ...billForm, quantity: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Unit Price (₦) *</Label><Input required type="number" step="0.01" min="0" value={billForm.unitPrice || ""} onChange={(e) => setBillForm({ ...billForm, unitPrice: e.target.value })} /></div>
            </div>
            {billForm.description && billForm.unitPrice && (
              <div className="text-right text-sm">
                <span className="text-slate-400">Total: </span>
                <span className="font-bold text-slate-900">₦{(parseInt(billForm.quantity || "1") * parseFloat(billForm.unitPrice || "0")).toLocaleString()}</span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBillModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Saving..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======== LAB RESULT OVERLAY ======== */}
      <Dialog open={!!selectedLabResult} onOpenChange={() => setSelectedLabResult(null)}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-500" />
              {selectedLabResult?.test?.name || "Lab Result"}
            </DialogTitle>
            <DialogDescription>
              {selectedLabResult?.createdAt ? new Date(selectedLabResult.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedLabResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{selectedLabResult.status}</Badge>
                {selectedLabResult.test?.category && (
                  <span className="text-xs text-slate-400">{selectedLabResult.test.category}</span>
                )}
              </div>
              {selectedLabResult.results && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Result</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{selectedLabResult.results.resultValue}</p>
                    </div>
                    {selectedLabResult.results.unit && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Unit</span>
                        <p className="font-semibold text-slate-900 mt-0.5">{selectedLabResult.results.unit}</p>
                      </div>
                    )}
                  </div>
                  {selectedLabResult.results.referenceRange && (
                    <div className="text-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Reference Range</span>
                      <p className="text-slate-700 mt-0.5">{selectedLabResult.results.referenceRange}</p>
                    </div>
                  )}
                  {selectedLabResult.results.interpretation && (
                    <div className="text-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Interpretation</span>
                      <p className="text-slate-700 mt-0.5">{selectedLabResult.results.interpretation}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-slate-400 space-y-1">
                <p>Requested: {selectedLabResult.createdAt ? new Date(selectedLabResult.createdAt).toLocaleString() : "—"}</p>
                {selectedLabResult.results?.date && (
                  <p>Completed: {new Date(selectedLabResult.results.date).toLocaleString()}</p>
                )}
                {((selectedLabResult.results as any)?.editedAt || (selectedLabResult.results as any)?.editedBy) && (
                  <p className="flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Edited by <span className="font-medium text-slate-600">{(selectedLabResult.results as any)?.editedBy ?? "Lab Technician"}</span>
                    {(selectedLabResult.results as any)?.editedAt && <span> on {new Date((selectedLabResult.results as any).editedAt).toLocaleString()}</span>}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLabResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== ADD DEPENDANT MODAL ======== */}
      <Dialog open={showDependantModal} onOpenChange={setShowDependantModal}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Dependant</DialogTitle>
            <DialogDescription>Register a new dependant for this folder.</DialogDescription>
          </DialogHeader>
          {patient.category === "Individual" && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">This will become a Family folder</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Adding a dependant will upgrade this folder to a Family folder.
                  The current patient will become the primary member and will appear on the Family page.
                </p>
              </div>
            </div>
          )}
          {(patient.category === "Corporate" || patient.category === "HMO") && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">This patient will become a primary member</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Adding a dependant will keep this patient as a {patient.category} folder.
                  The current patient will become the primary member with beneficiaries.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleDependantSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input required value={dependantForm.firstName} onChange={(e) => setDependantForm({ ...dependantForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input required value={dependantForm.lastName} onChange={(e) => setDependantForm({ ...dependantForm, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <SearchableSelect value={dependantForm.gender} onValueChange={(v) => setDependantForm({ ...dependantForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <Input type="date" required value={dependantForm.dateOfBirth} onChange={(e) => setDependantForm({ ...dependantForm, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <SearchableSelect value={dependantForm.bloodGroup} onValueChange={(v) => setDependantForm({ ...dependantForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship *</Label>
                <SearchableSelect value={dependantForm.relationship} onValueChange={(v) => setDependantForm({ ...dependantForm, relationship: v })} placeholder="Select" options={RELATIONSHIP_OPTIONS.map(r => ({value: r, label: r}))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDependantModal(false); setDependantForm({ firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "", relationship: "" }); }}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createDependant.isPending}>
                {createDependant.isPending ? "Saving..." : "Add Dependant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientProfile;
