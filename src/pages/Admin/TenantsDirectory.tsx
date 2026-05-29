import React, { useEffect, useState } from "react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tenant } from "../../types/tenant";
import { getDefaultSettings } from "@/src/lib/globalSettings";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-300",
    Suspended: "bg-red-100 text-red-700 border-red-300",
  };
  return colors[status] || "bg-slate-100 text-slate-600";
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
  const [formSuccess, setFormSuccess] = useState("");

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
    setFormSuccess("");

    const slug = form.urlSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) { setFormError("Invalid slug"); setSubmitting(false); return; }

    const tenantId = `T-${slug.toUpperCase().slice(0, 8)}`;

    const tierLimits: Record<string, { seats: number; beds: number }> = {
      Standard: { seats: 10, beds: 0 },
      Premium: { seats: 50, beds: 40 },
      Enterprise: { seats: 99999, beds: 99999 },
    };
    const limits = tierLimits[form.tier] || tierLimits.Standard;

    const { error: tenantError } = await adminSupabase.from("tenants").insert({
      tenant_id: tenantId,
      hospital_name: form.hospitalName,
      url_slug: slug,
      status: "Active",
      tier: form.tier,
      admin_email: form.adminEmail || null,
      max_staff_seats: limits.seats,
      max_bed_capacity: limits.beds,
    });

    if (tenantError) {
      if (tenantError.message.includes("url_slug")) setFormError("This URL slug is already taken");
      else setFormError(tenantError.message);
      setSubmitting(false);
      return;
    }

    // Seed default settings for this tenant
    await adminSupabase.from("global_settings").upsert(
      {
        id: 1,
        tenant_id: tenantId,
        settings: getDefaultSettings(),
        updated_at: new Date().toISOString(),
        updated_by: null,
      },
      { onConflict: "tenant_id,id" },
    );

    // Create the admin auth user
    if (form.adminEmail) {
      try {
        const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";
        const { data: authData, error: createError } = await adminSupabase.auth.admin.createUser({
          email: form.adminEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: `${form.hospitalName} Admin`, role: "HospitalAdmin" },
        });

        if (createError) {
          // If user already exists in Auth, look them up and still link
          if (createError.message?.toLowerCase().includes("already registered") || createError.message?.toLowerCase().includes("already exists")) {
            const { data: authUsers } = await (adminSupabase as any).auth.admin.listUsers();
            const existingUser = (authUsers as any)?.users?.find((u: any) => u.email === form.adminEmail);
            if (existingUser?.id) {
              // UPSERT: update existing profile or insert one
              const { data: existingProfile } = await (adminSupabase as any)
                .from("users")
                .select("id")
                .eq("id", existingUser.id)
                .maybeSingle();

              if (existingProfile) {
                await (adminSupabase as any)
                  .from("users")
                  .update({ tenant_id: tenantId, updated_at: new Date().toISOString() })
                  .eq("id", existingUser.id);
              } else {
                await (adminSupabase as any).from("users").insert({
                  id: existingUser.id,
                  email: form.adminEmail,
                  tenant_id: tenantId,
                  full_name: `${form.hospitalName} Admin`,
                  role: "HospitalAdmin",
                  status: "active",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }

              setFormSuccess("Tenant created and linked to existing admin user.");
              setTimeout(() => setFormSuccess(""), 3000);
              setSubmitting(false);
              setModalOpen(false);
              setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
              fetchTenants();
              return;
            }
          }
          setFormError(`Tenant created, but admin user creation failed: ${createError.message}. Set their password manually from the tenant details page.`);
          setSubmitting(false);
          setModalOpen(false);
          setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
          fetchTenants();
          return;
        }

        if (authData?.user?.id) {
          // Check if a users-table record already exists for this auth ID
          const { data: existingProfile } = await (adminSupabase as any)
            .from("users")
            .select("id")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (existingProfile) {
            // Record exists — update tenant_id
            const { error: updateErr } = await (adminSupabase as any)
              .from("users")
              .update({ tenant_id: tenantId, updated_at: new Date().toISOString() })
              .eq("id", authData.user.id);

            if (updateErr) {
              setFormError(`Tenant and auth user created, but tenant_id assignment failed: ${updateErr.message}.`);
              setSubmitting(false);
              return;
            }
          } else {
            // No record — insert one
            const { error: insertError } = await (adminSupabase as any).from("users").insert({
              id: authData.user.id,
              email: form.adminEmail,
              tenant_id: tenantId,
              full_name: `${form.hospitalName} Admin`,
              role: "HospitalAdmin",
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            if (insertError) {
              setFormError(`Tenant and auth user created, but profile insert failed: ${insertError.message}. You can retry by resetting the password from the tenant details page.`);
              setSubmitting(false);
              return;
            }
          }
        }
      } catch (err: any) {
        setFormError(`Tenant created, but admin setup failed: ${err.message || "Unknown error"}.`);
        setSubmitting(false);
        setModalOpen(false);
        setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
        fetchTenants();
        return;
      }
    }

    setSubmitting(false);
    setModalOpen(false);
    setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
    fetchTenants();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Hospital Accounts</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-sm text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Provision New Hospital
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">URL Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-md" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">No hospitals found</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.tenantId}
                    className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors duration-200"
                    onClick={() => navigate(`/admin/tenants/${t.tenantId}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{t.hospitalName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.urlSlug}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Provision New Hospital</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Create a new tenant workspace on the platform.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProvision}>
            <div className="space-y-4 py-2">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formSuccess}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Name</Label>
                <Input
                  required
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., City Health Medical Center"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">URL Slug</Label>
                <Input
                  required
                  value={form.urlSlug}
                  onChange={(e) => setForm({ ...form, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="bg-white border-slate-300 text-slate-900 font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., cityhealth"
                />
                <p className="text-[10px] text-slate-400">URL: icare.ng/<strong className="text-blue-600">{form.urlSlug || "slug"}</strong>/login</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin Email</Label>
                <Input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-700">
                    <SelectItem value="Standard">Standard — {'\u20A6'}199,000/mo (10 seats, 0 beds)</SelectItem>
                    <SelectItem value="Premium">Premium — {'\u20A6'}499,000/mo (50 seats, 40 beds)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise — {'\u20A6'}999,000/mo (unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-slate-500">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white">
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
