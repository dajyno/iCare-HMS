import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, UserRound, Stethoscope, BedDouble, TrendingUp, DollarSign, Mail, Key, Loader2, AlertCircle, ExternalLink, CheckCircle2, Settings, Save } from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Tenant } from "../../types/tenant";
import { ALL_MODULES } from "../../lib/moduleAccess";

const CURRENCY = "\u20A6";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Trial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[status] || "bg-slate-500/20 text-slate-400";
};

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-[#0d0d1a] border border-[#1a1a35] rounded-xl p-5 transition-all duration-300 hover:border-[#0088ff]/30 hover:shadow-[0_0_20px_rgba(0,136,255,0.04)]">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-[#8888aa] uppercase tracking-wider">{label}</span>
      <div className="w-9 h-9 rounded-lg bg-[#0088ff] flex items-center justify-center shadow-[0_0_12px_rgba(0,136,255,0.15)]">
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const TenantDetail: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [usersCount, setUsersCount] = useState(0);
  const [doctorsCount, setDoctorsCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [bedsCount, setBedsCount] = useState(0);
  const [tierMonthlyPrice, setTierMonthlyPrice] = useState(0);

  const [adminEmail, setAdminEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [editStaffSeats, setEditStaffSeats] = useState(0);
  const [editBedCapacity, setEditBedCapacity] = useState(0);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editModuleOverride, setEditModuleOverride] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState("");

  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!tenantId) { setNotFound(true); setLoading(false); return; }

    async function fetchData() {
      const { data: tData, error: tError } = await adminSupabase
        .from("tenants")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (tError || !tData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const t = toCamel(tData) as Tenant;
      setTenant(t);
      setAdminEmail((t as any).adminEmail || "");

      const [
        { count: uCount },
        { count: dCount },
        { count: pCount },
        { data: wards },
      ] = await Promise.all([
        adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "Doctor"),
        adminSupabase.from("patients").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        adminSupabase.from("wards").select("beds_count").eq("tenant_id", tenantId),
      ]);

      setUsersCount(uCount || 0);
      setDoctorsCount(dCount || 0);
      setPatientsCount(pCount || 0);
      setBedsCount((wards || []).reduce((sum: number, w: any) => sum + (w.beds_count || 0), 0));

      const { data: tierRow } = await adminSupabase
        .from("subscription_tiers")
        .select("monthly_price")
        .eq("name", t.tier)
        .maybeSingle();
      setTierMonthlyPrice((tierRow as any)?.monthly_price || 0);

      setLoading(false);
    }

    fetchData();
  }, [tenantId]);

  const handleSaveAdminEmail = async () => {
    if (!tenantId) return;
    setSavingEmail(true);
    setEmailError("");
    setEmailSaved(false);

    const { error } = await adminSupabase
      .from("tenants")
      .update({ admin_email: adminEmail || null })
      .eq("tenant_id", tenantId);

    if (error) {
      setEmailError(error.message);
      setSavingEmail(false);
      return;
    }

    setSavingEmail(false);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  };

  const handleResetPassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setResettingPassword(true);
    try {
      const { data: existing } = await adminSupabase
        .from("users")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (existing && existing.length > 0) {
        const user = existing[0];
        await adminSupabase.auth.admin.updateUserById(user.id, { password: newPassword });
        setPasswordSuccess(`Password updated for ${user.email || "tenant admin"}`);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { setShowResetModal(false); setPasswordSuccess(""); }, 2000);
        setResettingPassword(false);
        return;
      }

      // No user record with this tenant_id — try to find the auth user by
      // the tenant's admin_email and create the users table record
      const { data: tData } = await (adminSupabase as any)
        .from("tenants")
        .select("admin_email, hospital_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const adminEmail = (tData as any)?.admin_email;
      if (!adminEmail) {
        setPasswordError("No admin email is set for this tenant. Set one in Admin Management first, then try again.");
        setResettingPassword(false);
        return;
      }

      const { data: authUsers } = await (adminSupabase as any).auth.admin.listUsers();
      const authUser = (authUsers as any)?.users?.find((u: any) => u.email === adminEmail);

      if (authUser) {
        // Check if a users-table record already exists for this auth user
        const { data: profile } = await (adminSupabase as any)
          .from("users")
          .select("id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profile) {
          // Record exists — just update tenant_id
          const { error: updateErr } = await (adminSupabase as any)
            .from("users")
            .update({ tenant_id: tenantId, updated_at: new Date().toISOString() })
            .eq("id", authUser.id);

          if (updateErr) {
            setPasswordError(`Could not link auth user to tenant: ${updateErr.message}`);
            setResettingPassword(false);
            return;
          }
        } else {
          // No record — insert one
          const { error: insertErr } = await (adminSupabase as any).from("users").insert({
            id: authUser.id,
            email: adminEmail,
            tenant_id: tenantId,
            full_name: (tData as any)?.hospital_name ? `${(tData as any).hospital_name} Admin` : adminEmail,
            role: "HospitalAdmin",
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertErr) {
            setPasswordError(`Could not link auth user to tenant: ${insertErr.message}`);
            setResettingPassword(false);
            return;
          }
        }

        await adminSupabase.auth.admin.updateUserById(authUser.id, { password: newPassword });
        setPasswordSuccess(`Password updated for ${adminEmail}`);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { setShowResetModal(false); setPasswordSuccess(""); }, 2000);
      } else {
        const tempPw = Math.random().toString(36).slice(2, 10) + "A1!";
        const { data: newAuth, error: createErr } = await (adminSupabase as any).auth.admin.createUser({
          email: adminEmail,
          password: tempPw,
          email_confirm: true,
          user_metadata: { full_name: (tData as any)?.hospital_name ? `${(tData as any).hospital_name} Admin` : adminEmail, role: "HospitalAdmin" },
        });

        if (createErr || !(newAuth as any)?.user?.id) {
          setPasswordError(`Could not create auth user: ${createErr?.message || "Unknown error"}`);
          setResettingPassword(false);
          return;
        }

        const { error: insertErr2 } = await (adminSupabase as any).from("users").insert({
          id: (newAuth as any).user.id,
          email: adminEmail,
          tenant_id: tenantId,
          full_name: (tData as any)?.hospital_name ? `${(tData as any).hospital_name} Admin` : adminEmail,
          role: "HospitalAdmin",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertErr2) {
          setPasswordError(`Auth user created but profile insert failed: ${insertErr2.message}`);
          setResettingPassword(false);
          return;
        }

        await (adminSupabase as any).auth.admin.updateUserById((newAuth as any).user.id, { password: newPassword });
        setPasswordSuccess(`Admin account created and password set for ${adminEmail}`);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { setShowResetModal(false); setPasswordSuccess(""); }, 2000);
      }
    } catch (err: any) {
      setPasswordError(err.message || "Password reset failed");
    }
    setResettingPassword(false);
  };

  const handleStatusAction = async (newStatus: string) => {
    if (!tenantId) return;
    await adminSupabase.from("tenants").update({ status: newStatus }).eq("tenant_id", tenantId);
    const { data: refreshed } = await adminSupabase.from("tenants").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (refreshed) setTenant(toCamel(refreshed) as Tenant);
  };

  const openEditLimits = () => {
    if (!tenant) return;
    setEditStaffSeats(tenant.maxStaffSeats);
    setEditBedCapacity(tenant.maxBedCapacity);
    const overrideRaw = (tenant as any).allowedModulesOverride;
    const overrideParsed: string[] = typeof overrideRaw === "string" ? JSON.parse(overrideRaw || "[]") : (overrideRaw ?? []);
    setEditModules(overrideParsed);
    setEditModuleOverride(overrideParsed.length > 0);
    setLimitsError("");
    setShowLimitsModal(true);
  };

  const handleSaveLimits = async () => {
    if (!tenantId) return;
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

    const { error } = await adminSupabase.from("tenants").update(updates).eq("tenant_id", tenantId);

    if (error) {
      setLimitsError(error.message);
      setSavingLimits(false);
      return;
    }

    setSavingLimits(false);
    setShowLimitsModal(false);

    const { data: refreshed } = await adminSupabase.from("tenants").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (refreshed) setTenant(toCamel(refreshed) as Tenant);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8888aa]" />
      </div>
    );
  }

  if (notFound || !tenant) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Hospital Not Found</h2>
        <p className="text-sm text-[#8888aa]">No tenant found with ID "{tenantId}"</p>
        <Button onClick={() => navigate("/admin/tenants")} className="mt-4 bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)]">
          Back to Hospital Accounts
        </Button>
      </div>
    );
  }

  const mrr = tierMonthlyPrice;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tenants")} className="text-[#8888aa] hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{tenant.hospitalName}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(tenant.status)}`}>
              {tenant.status}
            </span>
            <Badge variant="outline" className="text-[#0088ff] border-[#0088ff]/30 bg-[#0088ff]/10">
              {tenant.tier}
            </Badge>
          </div>
          <p className="text-xs text-[#8888aa] mt-1">
            <span className="font-mono">{tenant.urlSlug}</span>
            <span className="mx-2">·</span>
            ID: {tenant.tenantId}
            <span className="mx-2">·</span>
            Created: {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-[#0088ff] hover:text-[#00b4ff]"
          onClick={() => window.open(`/${tenant.urlSlug}/dashboard`, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Open Hospital Dashboard
        </Button>
      </div>

      {/* Admin Management */}
      <div className="bg-[#0d0d1a] border border-[#1a1a35] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#0088ff]" />
          Admin Management
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Admin Email</Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => { setAdminEmail(e.target.value); setEmailSaved(false); }}
              placeholder="admin@hospital.com"
              className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
            />
            {emailError && <p className="text-[10px] text-red-400">{emailError}</p>}
          </div>
          <Button onClick={handleSaveAdminEmail} disabled={savingEmail} className="bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-sm h-10 min-w-[130px]">
            {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {emailSaved ? "Saved" : "Save"}
          </Button>
          <Button onClick={() => setShowResetModal(true)} variant="outline" className="border-[#004488]/30 text-[#004488] hover:text-[#0055aa] text-sm h-10">
            <Key className="w-3.5 h-3.5 mr-1.5" />
            Reset Password
          </Button>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={showResetModal} onOpenChange={(o) => { if (!o) { setShowResetModal(false); setPasswordError(""); setPasswordSuccess(""); setNewPassword(""); setConfirmPassword(""); }}}>
        <DialogContent className="bg-[#0d0d1a] border-[#1a1a35] text-[#e8e8f0] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-[#8888aa] text-xs">
              Set a new password for {tenant.hospitalName}'s admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {passwordError && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {passwordSuccess}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowResetModal(false); setPasswordError(""); setPasswordSuccess(""); setNewPassword(""); setConfirmPassword(""); }} className="text-[#8888aa]">
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)]">
              {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hospital Controls */}
      <div className="bg-[#0d0d1a] border border-[#1a1a35] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#0088ff]" />
          Hospital Controls
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={openEditLimits} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)] text-sm">
            Edit Limits
          </Button>
          {tenant.status !== "Suspended" ? (
            <Button onClick={() => handleStatusAction("Suspended")} className="bg-red-600 hover:bg-red-700 text-white text-sm">
              Suspend Account
            </Button>
          ) : (
            <Button onClick={() => handleStatusAction("Active")} variant="outline" className="border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/30 text-sm">
              Reactivate Account
            </Button>
          )}
          <Button onClick={() => handleStatusAction("Trial")} className="bg-amber-600 hover:bg-amber-700 text-white text-sm">
            Set to Trial
          </Button>
        </div>
      </div>

      {/* Edit Limits Modal */}
      <Dialog open={showLimitsModal} onOpenChange={(o) => { if (!o) { setShowLimitsModal(false); setLimitsError(""); }}}>
        <DialogContent className="bg-[#0d0d1a] border-[#1a1a35] text-[#e8e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Edit Limits — {tenant.hospitalName}</DialogTitle>
            <DialogDescription className="text-[#8888aa] text-xs">
              Override subscription limits for this hospital.
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
              <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Max Staff Seats</Label>
              <Input
                type="number" min={0}
                value={editStaffSeats}
                onChange={(e) => setEditStaffSeats(parseInt(e.target.value) || 0)}
                className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Max Bed Capacity</Label>
              <Input
                type="number" min={0}
                value={editBedCapacity}
                onChange={(e) => setEditBedCapacity(parseInt(e.target.value) || 0)}
                className="bg-[#07070d] border-[#1a1a35] text-[#e8e8f0] focus:border-[#0088ff] focus:ring-[#0088ff]/25"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#8888aa] uppercase tracking-wider">Module Override</Label>
                <button
                  onClick={() => setEditModuleOverride(!editModuleOverride)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editModuleOverride ? "bg-[#0088ff]" : "bg-[#1a1a35]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editModuleOverride ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {editModuleOverride && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {ALL_MODULES.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 text-xs text-[#b0b0cc] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editModules.includes(mod)}
                        onChange={(e) => {
                          if (e.target.checked) setEditModules([...editModules, mod]);
                          else setEditModules(editModules.filter((m) => m !== mod));
                        }}
                        className="rounded bg-[#0d0d1a] border-[#1a1a35]"
                      />
                      {mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              )}
              {!editModuleOverride && (
                <p className="text-[10px] text-[#666688]">Using tier defaults. Toggle override to customize.</p>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowLimitsModal(false); setLimitsError(""); }} className="text-[#8888aa]">
              Cancel
            </Button>
            <Button onClick={handleSaveLimits} disabled={savingLimits} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)]">
              {savingLimits ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hospital Metrics */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0088ff]" />
          Hospital Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Users} label="System Users" value={String(usersCount)} />
          <MetricCard icon={Stethoscope} label="Doctors" value={String(doctorsCount)} />
          <MetricCard icon={UserRound} label="Patients" value={String(patientsCount)} />
          <MetricCard icon={BedDouble} label="Beds (Capacity)" value={String(bedsCount)} />
          <MetricCard icon={TrendingUp} label="Monthly Contribution" value={`${CURRENCY}${mrr.toLocaleString()}`} />
          <MetricCard icon={DollarSign} label="Annual Contribution" value={`${CURRENCY}${(mrr * 12).toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;
