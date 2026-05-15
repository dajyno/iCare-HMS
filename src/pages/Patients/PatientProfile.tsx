import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Edit, Save,
  Stethoscope, FlaskConical, Pill, Activity, AlertCircle, Loader2,
  BadgeCheck, FolderOpen, Users, Building, Shield, Clock, Plus,
  HeartPulse, Microscope, Receipt, Bone, Thermometer, Scale, Droplets, Ruler
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const categoryBadge: Record<string, string> = {
  Individual: "bg-blue-50 text-blue-700", Family: "bg-emerald-50 text-emerald-700",
  Corporate: "bg-purple-50 text-purple-700", HMO: "bg-amber-50 text-amber-700",
};

const PatientProfile = () => {
  const { id } = useParams();
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
        .select("*, doctor:users(full_name)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

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

  const { data: prescriptions } = useQuery({
    queryKey: ["patient-rx", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, doctor:users(full_name), items:prescription_items(*, medication:medications(name, strength))")
        .eq("patient_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!id,
  });

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
      return toCamel(data);
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
      const fields = "id, patient_id, first_name, last_name, phone, gender, is_primary, family_id";
      if (patient.isPrimary) {
        const { data, error } = await supabase
          .from("patients")
          .select(fields)
          .eq("family_id", patient.id)
          .order("first_name", { ascending: true });
        if (error) throw error;
        return toCamel(data);
      }
      const { data: primary } = await supabase
        .from("patients")
        .select(fields)
        .eq("id", patient.familyId)
        .single();
      const { data: others } = await supabase
        .from("patients")
        .select(fields)
        .eq("family_id", patient.familyId)
        .neq("id", id)
        .order("first_name", { ascending: true });
      if (others) others.unshift(toCamel(primary));
      return toCamel(others || [primary]);
    },
    enabled: !!patient && patient.category === "Family",
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
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowEditModal(false);
    },
  });

  const createConsultation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("consultations").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consultations", id] });
      setShowConsultModal(false);
      setConsultForm({});
    },
  });

  const createVitals = useMutation({
    mutationFn: async (payload: any) => {
      const { data: consult, error: consultError } = await supabase
        .from("consultations")
        .insert({ patient_id: id, doctor_id: currentUser?.id, chief_complaint: "Vitals Check" })
        .select()
        .single();
      if (consultError) throw consultError;
      const { error: vitalsError } = await supabase
        .from("vital_signs")
        .insert({ ...payload, consultation_id: consult.id });
      if (vitalsError) throw vitalsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-vitals", id] });
      queryClient.invalidateQueries({ queryKey: ["patient-consultations", id] });
      setShowVitalsModal(false);
      setVitalsForm({});
    },
    onError: (err: Error) => {
      if (err.message?.includes("foreign key") || err.message?.includes("violates")) {
        alert("Database constraint error: Your user profile needs to be set up. Please run the updated supabase-schema.sql in your Supabase SQL Editor to fix FK constraints.");
      } else {
        alert(`Failed to save vital signs: ${err.message}`);
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
      queryClient.invalidateQueries({ queryKey: ["patient-labs", id] });
      setShowLabModal(false);
      setLabForm({});
    },
  });

  const createRadRequest = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("lab_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-labs", id] });
      setShowRadModal(false);
      setRadForm({});
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
      queryClient.invalidateQueries({ queryKey: ["patient-rx", id] });
      setShowRxModal(false);
      setRxForm({});
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
      if (items && items.length > 0) {
        const { error: itemError } = await supabase
          .from("invoice_items")
          .insert(items.map((i: any) => ({ ...i, invoice_id: inv.id })));
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-invoices", id] });
      setShowBillModal(false);
      setBillForm({});
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _, patientId, createdAt, registrationDate, ...rest } = editForm;
    const payload: any = {};
    const category = editForm.category;
    for (const [key, val] of Object.entries(rest)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (category !== "Corporate" && ["companyName", "companyPhone", "companyAddress"].includes(key)) continue;
      if (category !== "HMO" && ["insuranceProvider", "insuranceId"].includes(key)) continue;
      payload[dbKey] = val || null;
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

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(billForm.quantity) || 1;
    const unitPrice = parseFloat(billForm.unitPrice) || 0;
    const total = qty * unitPrice;
    const invNum = `INV-${Date.now()}`;
    createInvoice.mutate({
      patient_id: id,
      invoice_number: invNum,
      total_amount: total,
      amount_paid: 0,
      balance: total,
      status: "Unpaid",
      created_by: currentUser?.id,
      items: [{ description: billForm.description, quantity: qty, unit_price: unitPrice, total }],
    });
  };

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (isError || !patient) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p>Patient not found</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/patients")}>Back to Patients</Button>
    </div>
  );

  const radiologyRequests = Array.isArray(labRequests)
    ? labRequests.filter((lr: any) => lr.test?.category === "Radiology")
    : [];

  const regularLabs = Array.isArray(labRequests)
    ? labRequests.filter((lr: any) => lr.test?.category !== "Radiology")
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} className="h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Profile</h1>
          <p className="text-sm text-slate-500">{patient.patientId}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button onClick={openEdit} className="bg-blue-600 hover:bg-blue-700">
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              {patient.firstName?.[0]}{patient.lastName?.[0]}
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
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-white border p-1 h-auto w-max min-w-full">
            <TabsTrigger value="overview" className="gap-2 px-4 py-2 whitespace-nowrap"><Activity className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="vitals" className="gap-2 px-4 py-2 whitespace-nowrap"><HeartPulse className="w-4 h-4" /> Vital Signs</TabsTrigger>
            <TabsTrigger value="consultations" className="gap-2 px-4 py-2 whitespace-nowrap"><Stethoscope className="w-4 h-4" /> Consultations</TabsTrigger>
            <TabsTrigger value="labs" className="gap-2 px-4 py-2 whitespace-nowrap"><FlaskConical className="w-4 h-4" /> Lab Results</TabsTrigger>
            <TabsTrigger value="radiology" className="gap-2 px-4 py-2 whitespace-nowrap"><Bone className="w-4 h-4" /> Radiology</TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2 px-4 py-2 whitespace-nowrap"><Pill className="w-4 h-4" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 px-4 py-2 whitespace-nowrap"><Receipt className="w-4 h-4" /> Billing</TabsTrigger>
          </TabsList>
        </div>

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

            {/* Family Members */}
            {patient.category === "Family" && Array.isArray(familyMembers) && familyMembers.length > 0 && (
              <CardContent className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-3">
                  <Users className="w-3.5 h-3.5" /> {patient.isPrimary ? "Dependants" : "Family Members"}
                </span>
                <div className="space-y-2">
                  {familyMembers.map((fm: any) => {
                    const isPrimary = fm.isPrimary || fm.id === patient.familyId;
                    const isSelf = fm.id === patient.id;
                    return (
                      <div key={fm.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: isPrimary ? "#fef3c7" : "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: isPrimary ? "#f59e0b" : "#10b981", color: "white" }}>
                            {fm.firstName?.[0]}{fm.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{fm.firstName} {fm.lastName} {isSelf && <span className="text-[10px] text-slate-400 font-normal">(current)</span>}</p>
                            <p className="text-xs text-slate-400">{fm.patientId} {isPrimary && "• Primary"}</p>
                          </div>
                        </div>
                        {!isSelf && (
                          <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-bold"
                            onClick={() => navigate(`/patients/${fm.id}`)}>
                            View Profile
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}

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
        </TabsContent>

        {/* ========== VITAL SIGNS ========== */}
        <TabsContent value="vitals" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowVitalsModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Record Vital Signs
            </Button>
          </div>
          {!Array.isArray(vitals) || vitals.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No vital signs recorded.</div>
          ) : (
            vitals.map((v: any) => {
              const vs = v.vitalSigns;
              return (
                <Card key={v.id} className="border-none shadow-sm ring-1 ring-slate-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-rose-500" /><span className="font-bold text-slate-900">Vital Signs</span></div>
                      <span className="text-xs text-slate-400">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {vs?.temperature && <div><span className="text-[10px] font-bold uppercase text-slate-400">Temp</span><p className="font-semibold mt-0.5">{vs.temperature} °C</p></div>}
                      {vs?.bloodPressure && <div><span className="text-[10px] font-bold uppercase text-slate-400">BP</span><p className="font-semibold mt-0.5">{vs.bloodPressure} mmHg</p></div>}
                      {vs?.pulseRate && <div><span className="text-[10px] font-bold uppercase text-slate-400">Pulse</span><p className="font-semibold mt-0.5">{vs.pulseRate} bpm</p></div>}
                      {vs?.respiratoryRate && <div><span className="text-[10px] font-bold uppercase text-slate-400">RR</span><p className="font-semibold mt-0.5">{vs.respiratoryRate} /min</p></div>}
                      {vs?.weight && <div><span className="text-[10px] font-bold uppercase text-slate-400">Weight</span><p className="font-semibold mt-0.5">{vs.weight} kg</p></div>}
                      {vs?.height && <div><span className="text-[10px] font-bold uppercase text-slate-400">Height</span><p className="font-semibold mt-0.5">{vs.height} cm</p></div>}
                      {vs?.bmi && <div><span className="text-[10px] font-bold uppercase text-slate-400">BMI</span><p className="font-semibold mt-0.5">{vs.bmi}</p></div>}
                      {vs?.oxygenSaturation && <div><span className="text-[10px] font-bold uppercase text-slate-400">SpO₂</span><p className="font-semibold mt-0.5">{vs.oxygenSaturation}%</p></div>}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ========== CONSULTATIONS ========== */}
        <TabsContent value="consultations" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowConsultModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Consultation
            </Button>
          </div>
          {!Array.isArray(consultations) || consultations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No consultation records found.</div>
          ) : (
            consultations.map((c: any) => (
              <Card key={c.id} className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Stethoscope className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-slate-900">{c.chiefComplaint}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""} — Dr. {c.doctor?.fullName || "Unknown"}
                      </p>
                      {c.diagnosis && <p className="text-sm text-slate-700 mt-2"><span className="font-semibold">Diagnosis:</span> {c.diagnosis}</p>}
                      {c.clinicalNotes && <p className="text-sm text-slate-600 mt-1">{c.clinicalNotes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ========== LAB RESULTS ========== */}
        <TabsContent value="labs" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowLabModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Lab Request
            </Button>
          </div>
          {regularLabs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No lab records found.</div>
          ) : (
            regularLabs.map((lr: any) => (
              <Card key={lr.id} className="border-none shadow-sm ring-1 ring-slate-200">
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
            <Button onClick={() => setShowRadModal(true)} className="bg-blue-600 hover:bg-blue-700">
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
                      <div className="flex items-center gap-2"><Bone className="w-4 h-4 text-indigo-500" /><span className="font-bold text-slate-900">{lr.test?.name || "Unknown"}</span></div>
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

        {/* ========== PRESCRIPTIONS ========== */}
        <TabsContent value="prescriptions" className="mt-6 space-y-4">
          <div className="flex justify-start">
            <Button onClick={() => setShowRxModal(true)} className="bg-blue-600 hover:bg-blue-700">
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
                  <p className="text-xs text-slate-500 mt-1">Dr. {rx.doctor?.fullName || "Unknown"} — {rx.date ? new Date(rx.date).toLocaleDateString() : ""}</p>
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
              <Card key={inv.id} className="border-none shadow-sm ring-1 ring-slate-200">
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
                      {inv.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm text-slate-600">
                          <span>{item.description} x{item.quantity}</span>
                          <span>₦{item.total?.toLocaleString()}</span>
                        </div>
                      ))}
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
      </Tabs>

      {/* ======== EDIT MODAL ======== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Folder number cannot be changed. Fields from other categories will be cleared on save.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Folder No.</Label><Input value={editForm.patientId || ""} disabled className="bg-slate-100" /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <SearchableSelect value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })} options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} />
              </div>
              <div className="space-y-1.5"><Label>First Name <span className="text-red-500">*</span></Label><Input required value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Last Name <span className="text-red-500">*</span></Label><Input required value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <SearchableSelect value={editForm.gender || ""} onValueChange={(v) => setEditForm({ ...editForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} />
              </div>
              <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={editForm.dateOfBirth || ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category <span className="text-red-500">*</span></Label>
                <SearchableSelect value={editForm.category || "Individual"} onValueChange={(v) => setEditForm({ ...editForm, category: v })} options={[{value:"Individual",label:"Individual"},{value:"Family",label:"Family"},{value:"Corporate",label:"Corporate"},{value:"HMO",label:"HMO"}]} />
              </div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Blood Group</Label>
                <SearchableSelect value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} />
              </div>
              <div className="col-span-2 space-y-1.5"><Label>Allergies / Medical History</Label><Textarea value={editForm.allergies || ""} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} /></div>
            </div>

            {editForm.category === "Corporate" && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Company Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Company Name</Label><SearchableSelect value={editForm.companyName || ""} onValueChange={(v) => setEditForm({ ...editForm, companyName: v })} placeholder="Search or type company name..." options={companySuggestions.map((name) => ({value: name, label: name}))} /></div>
                  <div className="space-y-1.5"><Label>Company Phone</Label><Input value={editForm.companyPhone || ""} onChange={(e) => setEditForm({ ...editForm, companyPhone: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Company Address</Label><Input value={editForm.companyAddress || ""} onChange={(e) => setEditForm({ ...editForm, companyAddress: e.target.value })} /></div>
                </div>
              </div>
            )}

            {editForm.category === "HMO" && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Insurance / HMO Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>HMO Provider</Label><SearchableSelect value={editForm.insuranceProvider || ""} onValueChange={(v) => setEditForm({ ...editForm, insuranceProvider: v })} placeholder="Search or type HMO provider..." options={hmoSuggestions.map((name) => ({value: name, label: name}))} /></div>
                  <div className="space-y-1.5"><Label>Insurance ID / Registration Number</Label><Input value={editForm.insuranceId || ""} onChange={(e) => setEditForm({ ...editForm, insuranceId: e.target.value })} /></div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Symptoms</Label><Textarea value={consultForm.symptoms || ""} onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Diagnosis</Label><Textarea value={consultForm.diagnosis || ""} onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Clinical Notes</Label><Textarea value={consultForm.clinicalNotes || ""} onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-3 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
};

export default PatientProfile;
