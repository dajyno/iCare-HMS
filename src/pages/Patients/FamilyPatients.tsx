import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Search, Plus, Users, Phone, Mail, Loader2, AlertCircle, ArrowLeft,
  ChevronRight, User, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FamilyPatients = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState<any>({});

  const { data: patients, isLoading, isError, error } = useQuery({
    queryKey: ["patients-family"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("category", "Family")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const familyGroups = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    const groups: Record<string, any[]> = {};
    for (const p of patients) {
      const key = p.lastName || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups)
      .map(([name, members]) => ({ name, members, count: members.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients]);

  const filteredMembers = useMemo(() => {
    if (!selectedFamily || !Array.isArray(patients)) return [];
    let list = patients.filter((p: any) => p.lastName === selectedFamily);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.patientId?.toLowerCase().includes(q) ||
        p.firstName?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    return list;
  }, [patients, selectedFamily, searchTerm]);

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase.from("patients").insert(formData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients-family"] });
      setShowNewModal(false);
      setNewForm({});
    },
  });

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patient_id: newForm.patientId,
      first_name: newForm.firstName,
      last_name: newForm.lastName,
      gender: newForm.gender,
      date_of_birth: newForm.dateOfBirth,
      phone: newForm.phone,
      email: newForm.email || null,
      category: "Family",
      status: "active",
      blood_group: newForm.bloodGroup || null,
      allergies: newForm.allergies || null,
      next_of_kin_name: newForm.nextOfKinName || null,
      next_of_kin_phone: newForm.nextOfKinPhone || null,
      next_of_kin_relation: newForm.nextOfKinRelation || null,
    };
    createMutation.mutate(payload);
  };

  const suggestFamilyId = () => {
    const base = (newForm.lastName || "FAM").toUpperCase().replace(/[^A-Z]/g, "").substring(0, 6);
    const existing = Array.isArray(patients) ? patients.filter((p: any) => p.patientId?.startsWith(base)) : [];
    const next = (existing.length + 1).toString().padStart(3, "0");
    return `${base}-${next}`;
  };

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (isError) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p>{error instanceof Error ? error.message : "Error loading family patients"}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {selectedFamily ? (
              <>
                <button onClick={() => { setSelectedFamily(null); setSearchTerm(""); }}>
                  <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-slate-700" />
                </button>
                Family: {selectedFamily}
              </>
            ) : (
              "Family Patients"
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {selectedFamily
              ? `${filteredMembers.length} member${filteredMembers.length !== 1 ? "s" : ""}`
              : `${familyGroups.length} family folder${familyGroups.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setNewForm({ category: "Family" }); setShowNewModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Patient
        </Button>
      </div>

      {selectedFamily && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within this family..."
            className="pl-9 bg-white max-w-md h-9"
          />
        </div>
      )}

      {!selectedFamily ? (
        /* Family Group Cards */
        familyGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No family folders yet</h3>
            <p className="text-slate-500">Create your first family patient to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyGroups.map((group) => (
              <Card
                key={group.name}
                className="border-none shadow-sm ring-1 ring-slate-200 hover:ring-emerald-300 transition-all cursor-pointer"
                onClick={() => setSelectedFamily(group.name)}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                      {group.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{group.name}</h3>
                      <p className="text-sm text-slate-500">{group.count} member{group.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Individual Members Table */
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-6 py-3 text-left">Patient</th>
                <th className="px-6 py-3 text-left">Folder No.</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">DOB</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {searchTerm ? "No members match your search." : "No members in this family."}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                          {p.firstName?.[0]}{p.lastName?.[0]}
                        </div>
                        <span className="font-semibold text-slate-900">{p.firstName} {p.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.patientId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3 opacity-40" />{p.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-bold" onClick={() => navigate(`/patients/${p.id}`)}>
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Patient Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>Create a new patient record linked to this family.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewSubmit} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input required value={newForm.firstName || ""} onChange={(e) => {
                  setNewForm({ ...newForm, firstName: e.target.value });
                }} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input required value={newForm.lastName || ""} onChange={(e) => {
                  const lastName = e.target.value;
                  const base = lastName.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 6);
                  const existing = Array.isArray(patients) ? patients.filter((p: any) => p.patientId?.startsWith(base)) : [];
                  const next = (existing.length + 1).toString().padStart(3, "0");
                  const suggestedId = `${base}-${next}`;
                  setNewForm({ ...newForm, lastName, patientId: newForm.patientId || suggestedId });
                }} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Select value={newForm.gender || ""} onValueChange={(v) => setNewForm({ ...newForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Folder No. *</Label>
                <Input required value={newForm.patientId || ""} onChange={(e) => setNewForm({ ...newForm, patientId: e.target.value })} placeholder="e.g. DOE-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <Input type="date" required value={newForm.dateOfBirth || ""} onChange={(e) => setNewForm({ ...newForm, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input required value={newForm.phone || ""} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newForm.email || ""} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select value={newForm.bloodGroup || ""} onValueChange={(v) => setNewForm({ ...newForm, bloodGroup: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Allergies</Label>
                <Textarea value={newForm.allergies || ""} onChange={(e) => setNewForm({ ...newForm, allergies: e.target.value })} />
              </div>
              <div className="col-span-3 border-t pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Next of Kin</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Name</Label><Input value={newForm.nextOfKinName || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinName: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={newForm.nextOfKinPhone || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinPhone: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Relation</Label><Input value={newForm.nextOfKinRelation || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinRelation: e.target.value })} /></div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyPatients;
