import React, { useEffect, useState } from "react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Plus, Search, AlertCircle, Loader2, MoreHorizontal, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tenant } from "../../types/tenant";
import { ALL_MODULES } from "../../lib/moduleAccess";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Trial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[status] || "bg-slate-500/20 text-slate-400";
};

const TenantsDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Provision form state
  const [form, setForm] = useState({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit limits state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editStaffSeats, setEditStaffSeats] = useState(0);
  const [editBedCapacity, setEditBedCapacity] = useState(0);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editModuleOverride, setEditModuleOverride] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState("");

  const fetchTenants = async () => {
    setLoading(true);
    const { data } = await adminSupabase.from("tenants").select("*").order("created_at", { ascending: false });
    if (data) setTenants(data.map((d: any) => toCamel(d) as Tenant));
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const filtered = tenants.filter((t) =>
    t.hospitalName.toLowerCase().includes(search.toLowerCase()) ||
    t.urlSlug.toLowerCase().includes(search.toLowerCase())
  );

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const slug = form.urlSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) { setFormError("Invalid slug"); setSubmitting(false); return; }

    const tenantId = `T-${slug.toUpperCase().slice(0, 8)}`;

    const tierLimits: Record<string, { seats: number; beds: number }> = {
      Standard: { seats: 10, beds: 0 },
      Premium: { seats: 50, beds: 40 },
      Enterprise: { seats: 99999, beds: 99999 },
    };
    const limits = tierLimits[form.tier] || tierLimits.Standard;

    const { error } = await adminSupabase.from("tenants").insert({
      tenant_id: tenantId,
      hospital_name: form.hospitalName,
      url_slug: slug,
      status: "Trial",
      tier: form.tier,
      admin_email: form.adminEmail || null,
      max_staff_seats: limits.seats,
      max_bed_capacity: limits.beds,
    });

    if (error) {
      if (error.message.includes("url_slug")) setFormError("This URL slug is already taken");
      else setFormError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setModalOpen(false);
    setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
    fetchTenants();
  };

  const openEditLimits = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditStaffSeats(tenant.maxStaffSeats);
    setEditBedCapacity(tenant.maxBedCapacity);
    const overrideRaw = tenant.allowedModulesOverride;
    const overrideParsed: string[] = typeof overrideRaw === "string" ? JSON.parse(overrideRaw || "[]") : (overrideRaw ?? []);
    setEditModules(overrideParsed);
    setEditModuleOverride(overrideParsed.length > 0);
    setLimitsError("");
  };

  const handleSaveLimits = async () => {
    if (!editingTenant) return;
    setSavingLimits(true);
    setLimitsError("");

    const updates: Record<string, any> = {
      max_staff_seats: editStaffSeats,
      max_bed_capacity: editBedCapacity,
    };
    if (editModuleOverride) {
      updates.allowed_modules_override = JSON.stringify(editModules);
    } else {
      updates.allowed_modules_override = null;
    }

    const { error } = await adminSupabase
      .from("tenants")
      .update(updates)
      .eq("tenant_id", editingTenant.tenantId);

    if (error) {
      setLimitsError(error.message);
      setSavingLimits(false);
      return;
    }

    setSavingLimits(false);
    setEditingTenant(null);
    fetchTenants();
  };

  const handleStatusAction = async (tenantId: string, newStatus: string) => {
    await adminSupabase.from("tenants").update({ status: newStatus }).eq("tenant_id", tenantId);
    fetchTenants();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Hospital Accounts</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Provision New Hospital
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 h-10"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hospital Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">URL Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">No hospitals found</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.tenantId}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => navigate(`/admin/tenants/${t.tenantId}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-200">{t.hospitalName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.urlSlug}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-slate-200">
                          <DropdownMenuItem onClick={() => navigate(`/admin/tenants/${t.tenantId}`)} className="text-sky-400 focus:text-sky-300 focus:bg-sky-900/30">
                            <ExternalLink className="w-3.5 h-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditLimits(t)} className="text-sky-400 focus:text-sky-300 focus:bg-sky-900/30">
                            Edit Limits
                          </DropdownMenuItem>
                          {t.status !== "Suspended" ? (
                            <DropdownMenuItem onClick={() => handleStatusAction(t.tenantId, "Suspended")} className="text-red-400 focus:text-red-300 focus:bg-red-900/30">
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleStatusAction(t.tenantId, "Active")} className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-900/30">
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStatusAction(t.tenantId, "Trial")} className="text-amber-400 focus:text-amber-300 focus:bg-amber-900/30">
                            Set to Trial
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Limits Modal */}
      <Dialog open={!!editingTenant} onOpenChange={(o) => !o && setEditingTenant(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Limits — {editingTenant?.hospitalName}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Override subscription limits for this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {limitsError && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {limitsError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Staff Seats</Label>
              <Input
                type="number"
                min={0}
                value={editStaffSeats}
                onChange={(e) => setEditStaffSeats(parseInt(e.target.value) || 0)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Bed Capacity</Label>
              <Input
                type="number"
                min={0}
                value={editBedCapacity}
                onChange={(e) => setEditBedCapacity(parseInt(e.target.value) || 0)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module Override</Label>
                <button
                  onClick={() => setEditModuleOverride(!editModuleOverride)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editModuleOverride ? "bg-sky-600" : "bg-slate-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editModuleOverride ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {editModuleOverride && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {ALL_MODULES.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editModules.includes(mod)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditModules([...editModules, mod]);
                          } else {
                            setEditModules(editModules.filter((m) => m !== mod));
                          }
                        }}
                        className="rounded bg-slate-700 border-slate-500"
                      />
                      {mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              )}
              {!editModuleOverride && (
                <p className="text-[10px] text-slate-500">Using tier defaults. Toggle override to customize.</p>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditingTenant(null)} className="text-slate-400">
              Cancel
            </Button>
            <Button onClick={handleSaveLimits} disabled={savingLimits} className="bg-sky-600 hover:bg-sky-700">
              {savingLimits ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provision Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Provision New Hospital</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Create a new tenant workspace on the platform.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProvision}>
            <div className="space-y-4 py-2">
              {formError && (
                <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hospital Name</Label>
                <Input
                  required
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="e.g., City Health Medical Center"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">URL Slug</Label>
                <Input
                  required
                  value={form.urlSlug}
                  onChange={(e) => setForm({ ...form, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="bg-slate-900/50 border-slate-600 text-slate-100 font-mono"
                  placeholder="e.g., cityhealth"
                />
                <p className="text-[10px] text-slate-500">URL: icare.ng/<strong className="text-sky-400">{form.urlSlug || "slug"}</strong>/login</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Email</Label>
                <Input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectItem value="Standard">Standard — \u20A6199,000/mo (10 seats, 0 beds)</SelectItem>
                    <SelectItem value="Premium">Premium — \u20A6499,000/mo (50 seats, 40 beds)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise — \u20A6999,000/mo (unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Provision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantsDirectory;
