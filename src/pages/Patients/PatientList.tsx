import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Search, Plus, Filter, MoreVertical, User, Phone, Mail,
  Loader2, AlertCircle, X, Save, Edit, Archive, CalendarDays,
  Stethoscope, FlaskConical, Pill, FileText, Activity, MapPin, Clock,
  Users, Building, Briefcase, Shield, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryBadge: Record<string, string> = {
  Individual: "bg-blue-50 text-blue-700 border-blue-100",
  Family: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Corporate: "bg-purple-50 text-purple-700 border-purple-100",
  HMO: "bg-amber-50 text-amber-700 border-amber-100",
};

const PatientList = ({ defaultCategory }: { defaultCategory?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [editPatient, setEditPatient] = useState<any>(null);
  const [apptPatient, setApptPatient] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory || "All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [hmoSuggestions, setHmoSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (defaultCategory) setCategoryFilter(defaultCategory);
  }, [defaultCategory]);

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

  const { data: patients, isLoading, isError, error } = useQuery({
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

  const { data: primaryPatients } = useQuery({
    queryKey: ["patients-family-primaries-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .eq("category", "Family")
        .eq("is_primary", true)
        .order("last_name");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "Doctor")
        .eq("status", "active");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase.from("patients").insert(formData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowNewModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("patients").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowEditModal(false);
      setEditPatient(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").update({ status: "inactive" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });

  const apptMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("appointments").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowApptModal(false);
      setApptPatient(null);
    },
  });

  const [newForm, setNewForm] = useState<any>({});
  const [editForm, setEditForm] = useState<any>({});
  const [apptForm, setApptForm] = useState<any>({});

  const openEdit = (p: any) => {
    setEditPatient(p);
    setEditForm({ ...p });
    setShowEditModal(true);
  };

  const openAppt = (p: any) => {
    setApptPatient(p);
    setApptForm({ patient_id: p.id, date: "", time: "", doctor_id: "", reason: "" });
    setShowApptModal(true);
  };

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isFamilyPrimary = newForm.category === "Family" && newForm.role !== "dependant";
    const payload = {
      patient_id: newForm.patientId,
      first_name: newForm.firstName,
      last_name: newForm.lastName,
      gender: newForm.gender,
      date_of_birth: newForm.dateOfBirth,
      phone: newForm.phone,
      email: newForm.email || null,
      address: newForm.address || null,
      category: newForm.category || "Individual",
      status: "active",
      is_primary: newForm.category === "Family" ? isFamilyPrimary : false,
      family_id: newForm.category === "Family" && newForm.role === "dependant" ? newForm.familyId || null : null,
      blood_group: newForm.bloodGroup || null,
      allergies: newForm.allergies || null,
      medical_history: newForm.medicalHistory || null,
      next_of_kin_name: newForm.nextOfKinName || null,
      next_of_kin_phone: newForm.nextOfKinPhone || null,
      next_of_kin_relation: newForm.nextOfKinRelation || null,
      company_name: newForm.companyName || null,
      company_phone: newForm.companyPhone || null,
      company_address: newForm.companyAddress || null,
      insurance_provider: newForm.insuranceProvider || null,
      insurance_id: newForm.insuranceId || null,
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, patientId, createdAt, registrationDate, ...rest } = editForm;
    const payload: any = {};
    for (const [key, val] of Object.entries(rest)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      payload[dbKey] = val || null;
    }
    payload.status = editForm.status || "active";
    updateMutation.mutate({ id: editPatient.id, ...payload });
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apptMutation.mutate({
      patient_id: apptForm.patient_id,
      doctor_id: apptForm.doctor_id,
      date: apptForm.date,
      time: apptForm.time,
      reason: apptForm.reason || null,
      status: "Scheduled",
    });
  };

  const filteredPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    let result = patients;
    if (categoryFilter && categoryFilter !== "All") {
      result = result.filter((p: any) => p.category === categoryFilter);
    }
    if (statusFilter && statusFilter !== "All") {
      result = result.filter((p: any) => p.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p: any) =>
        (p.patientId && p.patientId.toLowerCase().includes(term)) ||
        (p.firstName && p.firstName.toLowerCase().includes(term)) ||
        (p.lastName && p.lastName.toLowerCase().includes(term)) ||
        (p.phone && p.phone.toLowerCase().includes(term))
      );
    }
    return result;
  }, [patients, categoryFilter, statusFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-400 font-medium">Accessing patient records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-slate-50 border rounded-xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-blue-500 opacity-20 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Unable to load patients</h3>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {error instanceof Error ? error.message : "The server encountered an error while fetching the patient list."}
        </p>
        <Button onClick={() => window.location.reload()} className="bg-blue-600">Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patients</h1>
          <p className="text-slate-500 text-sm">Manage and register hospital patients</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters && <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700" onClick={() => { setNewForm({}); setShowNewModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Category</Label>
            <SearchableSelect value={categoryFilter} onValueChange={setCategoryFilter} options={[{value:"All",label:"All"},{value:"Individual",label:"Individual"},{value:"Family",label:"Family"},{value:"Corporate",label:"Corporate"},{value:"HMO",label:"HMO"}]} triggerClassName="w-36 h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Status</Label>
            <SearchableSelect value={statusFilter} onValueChange={setStatusFilter} options={[{value:"All",label:"All"},{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} triggerClassName="w-32 h-9" />
          </div>
          <Button variant="ghost" size="sm" className="h-9 text-slate-400" onClick={() => { setCategoryFilter("All"); setStatusFilter("All"); setSearchTerm(""); }}>
            Clear Filters
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, or phone..."
              className="pl-9 bg-white max-w-md h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left">Patient Details</th>
                <th className="px-6 py-3 text-left">Contact Info</th>
                <th className="px-6 py-3 text-left">Blood Group</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Registration</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.isArray(filteredPatients) && filteredPatients.length > 0 ? (
                filteredPatients.map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-xs font-mono text-slate-500 uppercase tracking-tighter">
                            {patient.patientId} • {patient.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-600">
                        <div className="flex items-center gap-2"><Phone className="w-3 h-3 opacity-40" /><span className="text-xs">{patient.phone}</span></div>
                        <div className="flex items-center gap-2"><Mail className="w-3 h-3 opacity-40" /><span className="text-xs">{patient.email || "N/A"}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 font-bold">{patient.bloodGroup || "UKN"}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`font-bold ${categoryBadge[patient.category] || "bg-slate-50 text-slate-700"}`}>
                        {patient.category || "Individual"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {patient.registrationDate ? new Date(patient.registrationDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 font-sans">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)}>
                            <FileText className="w-3.5 h-3.5 mr-2 text-blue-500" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(patient)}>
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openAppt(patient)}>
                            <CalendarDays className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Book Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600"
                            onClick={() => {
                              if (window.confirm(`Archive ${patient.firstName} ${patient.lastName}?`)) {
                                archiveMutation.mutate(patient.id);
                              }
                            }}
                          >
                            <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {!Array.isArray(filteredPatients) ? "Unexpected data format received." : "No patients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Patient Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
            <DialogDescription>Fill in the patient details to create a new record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input required value={newForm.firstName || ""} onChange={(e) => setNewForm({ ...newForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input required value={newForm.lastName || ""} onChange={(e) => setNewForm({ ...newForm, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender <span className="text-red-500">*</span></Label>
                <SearchableSelect value={newForm.gender || ""} onValueChange={(v) => setNewForm({ ...newForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} />
              </div>
              <div className="space-y-1.5">
                <Label>Folder No. <span className="text-red-500">*</span></Label>
                <Input required value={newForm.patientId || ""} onChange={(e) => setNewForm({ ...newForm, patientId: e.target.value })} placeholder={newForm.category === "Family" ? "e.g. DOE-001" : "e.g. PAT003"} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth <span className="text-red-500">*</span></Label>
                <Input type="date" required value={newForm.dateOfBirth || ""} onChange={(e) => setNewForm({ ...newForm, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Folder Type <span className="text-red-500">*</span></Label>
                <SearchableSelect value={newForm.category || "Individual"} onValueChange={(v) => {
                  const updated = { ...newForm, category: v };
                  if (v === "Primary") updated.category = "Family";
                  if (v === "HMO" && !updated.insuranceId) updated.insuranceId = "";
                  setNewForm(updated);
                }} options={[{value:"Individual",label:"Individual"},{value:"Family",label:"Family"},{value:"Corporate",label:"Corporate"},{value:"HMO",label:"HMO"}]} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input required value={newForm.phone || ""} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newForm.email || ""} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
              </div>
              {newForm.category === "Family" && (
                <div className="space-y-1.5">
                  <Label>Role <span className="text-red-500">*</span></Label>
                  <SearchableSelect value={newForm.role || "primary"} onValueChange={(v) => setNewForm({ ...newForm, role: v, familyId: v === "primary" ? null : newForm.familyId })} options={[{value:"primary",label:"Primary Member"},{value:"dependant",label:"Dependant"}]} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <SearchableSelect value={newForm.bloodGroup || ""} onValueChange={(v) => setNewForm({ ...newForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} />
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-1.5">
                <Label>Address</Label>
                <Input value={newForm.address || ""} onChange={(e) => setNewForm({ ...newForm, address: e.target.value })} />
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label>Allergies / Medical History</Label>
                <Textarea value={newForm.allergies || ""} onChange={(e) => setNewForm({ ...newForm, allergies: e.target.value })} placeholder="List any allergies or relevant history" />
              </div>

              {newForm.category === "Family" && newForm.role === "dependant" && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Family Head</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label>Select Primary Member <span className="text-red-500">*</span></Label>
                      <SearchableSelect value={newForm.familyId || ""} onValueChange={(v) => setNewForm({ ...newForm, familyId: v })} placeholder="Choose the family head" options={(Array.isArray(primaryPatients) ? primaryPatients : []).map((pp: any) => ({value: pp.id, label: `${pp.firstName} ${pp.lastName} (${pp.patientId})`}))} />
                    </div>
                  </div>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2 md:col-span-3 border-t pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Next of Kin / Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={newForm.nextOfKinName || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={newForm.nextOfKinPhone || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinPhone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relation</Label>
                    <Input value={newForm.nextOfKinRelation || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinRelation: e.target.value })} placeholder="Spouse, Parent..." />
                  </div>
                </div>
              </div>

              {newForm.category === "Corporate" && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Company Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Company Name</Label>
                      <SearchableSelect value={newForm.companyName || ""} onValueChange={(v) => setNewForm({ ...newForm, companyName: v })} placeholder="Search or type company name..." options={companySuggestions.map((name) => ({value: name, label: name}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Phone</Label>
                      <Input value={newForm.companyPhone || ""} onChange={(e) => setNewForm({ ...newForm, companyPhone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Address</Label>
                      <Input value={newForm.companyAddress || ""} onChange={(e) => setNewForm({ ...newForm, companyAddress: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {newForm.category === "HMO" && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Insurance / HMO Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>HMO Provider</Label>
                      <SearchableSelect value={newForm.insuranceProvider || ""} onValueChange={(v) => setNewForm({ ...newForm, insuranceProvider: v })} placeholder="Search or type HMO provider..." options={hmoSuggestions.map((name) => ({value: name, label: name}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Insurance ID / Registration Number</Label>
                      <Input value={newForm.insuranceId || ""} onChange={(e) => setNewForm({ ...newForm, insuranceId: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Patient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update patient information. Folder number cannot be changed.</DialogDescription>
          </DialogHeader>
          {editPatient && (
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Folder No.</Label>
                  <Input value={editForm.patientId || ""} disabled className="bg-slate-100" />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <SearchableSelect value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })} options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} />
                </div>
                <div className="space-y-1.5">
                  <Label>First Name <span className="text-red-500">*</span></Label>
                  <Input required value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name <span className="text-red-500">*</span></Label>
                  <Input required value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <SearchableSelect value={editForm.gender || ""} onValueChange={(v) => setEditForm({ ...editForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editForm.dateOfBirth ? editForm.dateOfBirth.substring(0, 10) : ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <SearchableSelect value={editForm.category || "Individual"} onValueChange={(v) => setEditForm({ ...editForm, category: v })} options={[{value:"Individual",label:"Individual"},{value:"Family",label:"Family"},{value:"Corporate",label:"Corporate"},{value:"HMO",label:"HMO"}]} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Blood Group</Label>
                  <SearchableSelect value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Allergies / Medical History</Label>
                  <Textarea value={editForm.allergies || ""} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} />
                </div>
              </div>

              {editForm.category === "Corporate" && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Company Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Company Name</Label>
                      <SearchableSelect value={editForm.companyName || ""} onValueChange={(v) => setEditForm({ ...editForm, companyName: v })} placeholder="Search or type company name..." options={companySuggestions.map((name) => ({value: name, label: name}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Phone</Label>
                      <Input value={editForm.companyPhone || ""} onChange={(e) => setEditForm({ ...editForm, companyPhone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Address</Label>
                      <Input value={editForm.companyAddress || ""} onChange={(e) => setEditForm({ ...editForm, companyAddress: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {editForm.category === "HMO" && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Insurance / HMO Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>HMO Provider</Label>
                      <SearchableSelect value={editForm.insuranceProvider || ""} onValueChange={(v) => setEditForm({ ...editForm, insuranceProvider: v })} placeholder="Search or type HMO provider..." options={hmoSuggestions.map((name) => ({value: name, label: name}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Insurance ID / Registration Number</Label>
                      <Input value={editForm.insuranceId || ""} onChange={(e) => setEditForm({ ...editForm, insuranceId: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Update Patient"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Book Appointment Modal */}
      <Dialog open={showApptModal} onOpenChange={setShowApptModal}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              {apptPatient ? `Schedule for ${apptPatient.firstName} ${apptPatient.lastName}` : "Select a patient first"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApptSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" required value={apptForm.date || ""} onChange={(e) => setApptForm({ ...apptForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Time *</Label>
              <Input type="time" required value={apptForm.time || ""} onChange={(e) => setApptForm({ ...apptForm, time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <SearchableSelect value={apptForm.doctor_id || ""} onValueChange={(v) => setApptForm({ ...apptForm, doctor_id: v })} placeholder="Select doctor" options={(Array.isArray(doctors) ? doctors : []).map((d: any) => ({value: d.id, label: d.fullName}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason / Notes</Label>
              <Textarea value={apptForm.reason || ""} onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })} placeholder="Reason for visit..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowApptModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={apptMutation.isPending}>
                {apptMutation.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientList;
