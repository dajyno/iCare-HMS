import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Edit, Save,
  Stethoscope, FlaskConical, Pill, Activity, AlertCircle, Loader2,
  BadgeCheck, FolderOpen, Users, Building, Shield, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const categoryBadge: Record<string, string> = {
  Individual: "bg-blue-50 text-blue-700", Family: "bg-emerald-50 text-emerald-700",
  Corporate: "bg-purple-50 text-purple-700", HMO: "bg-amber-50 text-amber-700",
};

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

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
        .select("*, doctor:users(full_name), vital_signs(*)")
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
        .select("*, test:lab_tests(name), results:lab_results(*)")
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _, patientId, createdAt, registrationDate, ...rest } = editForm;
    const payload: any = {};
    for (const [key, val] of Object.entries(rest)) {
      payload[key.replace(/([A-Z])/g, "_$1").toLowerCase()] = val || null;
    }
    updateMutation.mutate(payload);
  };

  const openEdit = () => {
    if (patient) {
      setEditForm({ ...patient, dateOfBirth: patient.dateOfBirth?.substring(0, 10) || "" });
      setShowEditModal(true);
    }
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
        <TabsList className="bg-white border p-1 h-auto">
          <TabsTrigger value="overview" className="gap-2 px-4 py-2"><Activity className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2 px-4 py-2"><Stethoscope className="w-4 h-4" /> Consultations</TabsTrigger>
          <TabsTrigger value="labs" className="gap-2 px-4 py-2"><FlaskConical className="w-4 h-4" /> Lab Results</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-2 px-4 py-2"><Pill className="w-4 h-4" /> Prescriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader><CardTitle className="text-sm font-bold">Medical Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Blood Group</span><p className="font-semibold mt-1">{patient.bloodGroup || "N/A"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Allergies</span><p className="font-semibold mt-1">{patient.allergies || "None"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Medical History</span><p className="font-semibold mt-1">{patient.medicalHistory || "None"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-slate-400">Registered</span><p className="font-semibold mt-1">{patient.registrationDate ? new Date(patient.registrationDate).toLocaleDateString() : "N/A"}</p></div>
            </CardContent>
          </Card>
          {patient.category === "HMO" && (patient.insuranceProvider || patient.insuranceId) && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200">
              <CardHeader><CardTitle className="text-sm font-bold">Insurance / HMO</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[10px] font-bold uppercase text-slate-400">Provider</span><p className="font-semibold mt-1">{patient.insuranceProvider || "N/A"}</p></div>
                <div><span className="text-[10px] font-bold uppercase text-slate-400">ID</span><p className="font-semibold mt-1">{patient.insuranceId || "N/A"}</p></div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consultations" className="mt-6 space-y-4">
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

        <TabsContent value="labs" className="mt-6 space-y-4">
          {!Array.isArray(labRequests) || labRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No lab records found.</div>
          ) : (
            labRequests.map((lr: any) => (
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

        <TabsContent value="prescriptions" className="mt-6 space-y-4">
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
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Folder number cannot be changed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Folder No.</Label><Input value={editForm.patientId || ""} disabled className="bg-slate-100" /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>First Name</Label><Input value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={editForm.gender || ""} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={editForm.dateOfBirth || ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editForm.category || "Individual"} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="HMO">HMO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Blood Group</Label>
                <Select value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={editForm.emergencyContact || ""} onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Allergies / Medical History</Label><Textarea value={editForm.allergies || ""} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientProfile;
