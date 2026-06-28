import { useState, useMemo } from "react";
import type * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Search, Plus, Users, Phone, Mail, AlertCircle, X,
  User, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/src/components/skeletons/PageSkeleton";
import { TableSkeleton } from "@/src/components/skeletons/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, SheetContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const FamilyPatients = () => {
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState<any>({});

  const { data: families, isLoading, isError, error } = useQuery({
    queryKey: ["patients-family-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("category", "Family")
        .eq("is_primary", true)
        .order("last_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: dependantCounts } = useQuery({
    queryKey: ["patients-dependant-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("family_id")
        .eq("category", "Family")
        .eq("is_primary", false);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data) {
        if (row.family_id) counts[row.family_id] = (counts[row.family_id] || 0) + 1;
      }
      return counts;
    },
  });

  const { data: primaryPatients } = useQuery({
    queryKey: ["patients-family-primaries"],
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

  const filteredFamilies = useMemo(() => {
    if (!Array.isArray(families)) return [];
    if (!searchTerm.trim()) return families;
    const q = searchTerm.toLowerCase();
    return families.filter((f: any) =>
      f.lastName?.toLowerCase().includes(q) ||
      f.firstName?.toLowerCase().includes(q) ||
      `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
      f.patientId?.toLowerCase().includes(q) ||
      f.phone?.includes(q)
    );
  }, [families, searchTerm]);

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase.from("patients").insert(formData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newPatient: any) => {
      const patient = toCamel(newPatient);
      toast.success("Family patient created successfully");
      queryClient.setQueryData(["patients"], (old: any) => Array.isArray(old) ? [...old, patient] : [patient]);
      if (patient?.isPrimary) {
        queryClient.setQueryData(["patients-family-groups"], (old: any) => Array.isArray(old) ? [...old, patient] : [patient]);
        queryClient.setQueryData(["patients-family-primaries"], (old: any) => Array.isArray(old) ? [...old, patient] : [patient]);
        queryClient.setQueryData(["patients-family-primaries-list"], (old: any) => Array.isArray(old) ? [...old, patient] : [patient]);
      }
      queryClient.invalidateQueries({ queryKey: ["patients-family-groups"] });
      queryClient.invalidateQueries({ queryKey: ["patients-dependant-counts"] });
      queryClient.invalidateQueries({ queryKey: ["patients-family-primaries"] });
      queryClient.invalidateQueries({ queryKey: ["patients-family-primaries-list"] });
      setShowNewModal(false);
      setNewForm({});
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.details || error?.hint || error?.error_description || JSON.stringify(error));
    },
  });

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isPrimary = newForm.role === "primary";
    const payload: any = {
      patient_id: newForm.patientId,
      first_name: newForm.firstName,
      last_name: newForm.lastName,
      gender: newForm.gender,
      date_of_birth: newForm.dateOfBirth,
      phone: newForm.phone,
      email: newForm.email || null,
      category: "Family",
      status: "active",
      is_primary: isPrimary,
      family_id: isPrimary ? null : newForm.familyId || null,
      blood_group: newForm.bloodGroup || null,
      allergies: newForm.allergies || null,
      next_of_kin_name: newForm.nextOfKinName || null,
      next_of_kin_phone: newForm.nextOfKinPhone || null,
      next_of_kin_relation: newForm.nextOfKinRelation || null,
    };
    const missing: string[] = [];
    if (!newForm.firstName?.trim()) missing.push("First Name");
    if (!newForm.lastName?.trim()) missing.push("Last Name");
    if (!newForm.gender) missing.push("Gender");
    if (!newForm.patientId?.trim()) missing.push("Folder No.");
    if (!newForm.dateOfBirth) missing.push("Date of Birth");
    if (!newForm.phone?.trim()) missing.push("Phone");
    if (missing.length) {
      toast.error(`Please fill in the required fields: ${missing.join(", ")}`);
      return;
    }
    createMutation.mutate(payload);
  };

  const suggestFamilyId = () => {
    const base = (newForm.lastName || "FAM").toUpperCase().replace(/[^A-Z]/g, "").substring(0, 6);
    const existing = Array.isArray(families) ? families.filter((p: any) => p.patientId?.startsWith(base)) : [];
    const next = (existing.length + 1).toString().padStart(3, "0");
    return `${base}-${next}`;
  };

  if (isLoading) return (
    <PageSkeleton title="Family Groups">
      <TableSkeleton rows={5} columns={4} />
    </PageSkeleton>
  );

  if (isError) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p>{error instanceof Error ? error.message : "Error loading family groups"}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">Family Groups</h1>
          <p className="text-sm text-slate-500">{Array.isArray(families) ? families.length : 0} families</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setNewForm({}); setShowNewModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Patient
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by family name, ID, or phone..."
              className="pl-9 bg-white max-w-md h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left">Family Name</th>
                <th className="px-6 py-3 text-left">Primary Member</th>
                <th className="px-6 py-3 text-left">Folder No.</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-center">Dependants</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {searchTerm ? "No families match your search." : "No family groups yet."}
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{f.lastName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                          {f.firstName?.[0]}{f.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {f.firstName} {f.lastName}
                          </div>
                          <div className="text-xs text-slate-500 uppercase tracking-tighter">
                            {f.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{f.patientId}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-600">
                        <div className="flex items-center gap-2"><Phone className="w-3 h-3 opacity-40" /><span className="text-xs">{f.phone}</span></div>
                        <div className="flex items-center gap-2"><Mail className="w-3 h-3 opacity-40" /><span className="text-xs">{f.email || "N/A"}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold gap-1">
                        <Users className="w-3 h-3" /> {dependantCounts?.[f.id] ?? 0}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-bold" onClick={(e) => { e.stopPropagation(); navigate(`/${hospital_slug}/patients/${f.id}`); }}>
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Patient Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <SheetContent showCloseButton={false} className="bg-white shadow-2xl overflow-hidden p-0 gap-0">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
            <DialogTitle className="text-base font-bold">Add Family Patient</DialogTitle>
            <DialogClose className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-xs text-slate-500">Create a new family patient record.</p>
            <form onSubmit={handleNewSubmit} id="new-family-form" className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    const existing = Array.isArray(families) ? families.filter((p: any) => p.patientId?.startsWith(base)) : [];
                    const next = (existing.length + 1).toString().padStart(3, "0");
                    const suggestedId = `${base}-${next}`;
                    setNewForm({ ...newForm, lastName, patientId: newForm.patientId || suggestedId });
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender *</Label>
                  <SearchableSelect value={newForm.gender || ""} onValueChange={(v) => setNewForm({ ...newForm, gender: v })} placeholder="Select" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]} />
                </div>
                <div className="space-y-1.5">
                  <Label>Folder No. *</Label>
                  <Input required value={newForm.patientId || ""} onChange={(e) => setNewForm({ ...newForm, patientId: e.target.value })} placeholder="e.g. DOE-001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth *</Label>
                  <DatePicker value={newForm.dateOfBirth || ""} onChange={(v) => setNewForm({ ...newForm, dateOfBirth: v })} fromYear={1930} toYear={new Date().getFullYear()} />
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
                  <SearchableSelect value={newForm.bloodGroup || ""} onValueChange={(v) => setNewForm({ ...newForm, bloodGroup: v })} placeholder="Select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => ({value:b,label:b}))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <SearchableSelect value={newForm.role || "primary"} onValueChange={(v) => setNewForm({ ...newForm, role: v, familyId: v === "primary" ? null : newForm.familyId })} options={[{value:"primary",label:"Primary Member"},{value:"dependant",label:"Dependant"}]} />
                </div>
                {newForm.role === "dependant" && (
                  <div className="space-y-1.5">
                    <Label>Family Head *</Label>
                    <SearchableSelect value={newForm.familyId || ""} onValueChange={(v) => setNewForm({ ...newForm, familyId: v })} placeholder="Select primary member" options={(Array.isArray(primaryPatients) ? primaryPatients : []).map((pp: any) => ({value: pp.id, label: `${pp.firstName} ${pp.lastName} (${pp.patientId})`}))} />
                  </div>
                )}
                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <Label>Allergies</Label>
                  <Textarea value={newForm.allergies || ""} onChange={(e) => setNewForm({ ...newForm, allergies: e.target.value })} />
                </div>
                <div className="col-span-1 sm:col-span-2 border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Next of Kin</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Name</Label><Input value={newForm.nextOfKinName || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinName: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input value={newForm.nextOfKinPhone || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinPhone: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Relation</Label><Input value={newForm.nextOfKinRelation || ""} onChange={(e) => setNewForm({ ...newForm, nextOfKinRelation: e.target.value })} /></div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-md px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 z-10">
            <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" form="new-family-form" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-100 transition-colors" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Member"}
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </div>
  );
};

export default FamilyPatients;
