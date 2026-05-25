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
import type { Tenant } from "../../types/tenant";

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

    const { error: tenantError } = await adminSupabase.from("tenants").insert({
      tenant_id: tenantId,
      hospital_name: form.hospitalName,
      url_slug: slug,
      status: "Trial",
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
          setFormError(`Tenant created, but admin user creation failed: ${createError.message}. Set their password manually from the tenant details page.`);
          setSubmitting(false);
          setModalOpen(false);
          setForm({ hospitalName: "", urlSlug: "", adminEmail: "", tier: "Standard" });
          fetchTenants();
          return;
        }

        if (authData?.user?.id) {
          const { error: insertError } = await adminSupabase.from("users").insert({
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
            setFormError(`Tenant and auth user created, but profile insert failed: ${insertError.message}.`);
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
        <h1 className="text-xl font-bold text-white">Hospital Accounts</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)] text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Provision New Hospital
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666688]" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#0d0d1a] border-[#1a1a35] text-[#e8e8f0] placeholder:text-[#4a4a6a] h-10 focus:border-[#0088ff] focus:ring-[#0088ff]/25"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d0d1a] border border-[#1a1a35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a35] bg-[#0d0d1a]/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888aa] uppercase tracking-wider">Hospital Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888aa] uppercase tracking-wider">URL Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888aa] uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888aa] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#666688]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#666688]">No hospitals found</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.tenantId}
                    className="border-b border-[#1a1a35]/50 hover:bg-[#0088ff]/[0.02] cursor-pointer transition-colors duration-200"
                    onClick={() => navigate(`/admin/tenants/${t.tenantId}`)}
                  >
                    <td className="px-4 py-3 font-medium text-[#d0d0e0]">{t.hospitalName}</td>
                    <td className="px-4 py-3 text-[#8888aa] font-mono text-xs">{t.urlSlug}</td>
                    <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
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
        <DialogContent className="bg-[#0d0d1a] border-[#1a1a35] text-[#e8e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Provision New Hospital</DialogTitle>
            <DialogDescription className="text-[#8888aa] text-xs">
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
                <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Hospital Name</Label>
                <Input
                  required
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
                  placeholder="e.g., City Health Medical Center"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">URL Slug</Label>
                <Input
                  required
                  value={form.urlSlug}
                  onChange={(e) => setForm({ ...form, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] font-mono focus:border-[#0088ff] focus:ring-[#0088ff]/25"
                  placeholder="e.g., cityhealth"
                />
                <p className="text-[10px] text-[#666688]">URL: icare.ng/<strong className="text-[#0088ff]">{form.urlSlug || "slug"}</strong>/login</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Admin Email</Label>
                <Input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Plan Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d0d1a] border-[#1a1a35] text-[#b0b0cc]">
                    <SelectItem value="Standard">Standard — {'\u20A6'}199,000/mo (10 seats, 0 beds)</SelectItem>
                    <SelectItem value="Premium">Premium — {'\u20A6'}499,000/mo (50 seats, 40 beds)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise — {'\u20A6'}999,000/mo (unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-[#8888aa]">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)]">
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
