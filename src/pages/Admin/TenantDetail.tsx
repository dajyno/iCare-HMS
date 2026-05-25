import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, UserRound, Stethoscope, BedDouble, TrendingUp, DollarSign, Mail, Key, Loader2, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Tenant } from "../../types/tenant";

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
      const { data: users } = await adminSupabase
        .from("users")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (users && users.length > 0) {
        const user = users[0];
        await adminSupabase.auth.admin.updateUserById(user.id, { password: newPassword });
        setPasswordSuccess(`Password updated for ${user.email || "tenant admin"}`);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { setShowResetModal(false); setPasswordSuccess(""); }, 2000);
      } else {
        setPasswordError("No user found for this tenant. Ensure a user exists with this tenant_id.");
      }
    } catch (err: any) {
      setPasswordError(err.message || "Password reset failed");
    }
    setResettingPassword(false);
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
          <Button onClick={handleSaveAdminEmail} disabled={savingEmail} className="bg-[#0088ff] hover:bg-[#0077ee] shadow-[0_0_12px_rgba(0,136,255,0.15)] text-sm h-10">
            {savingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {emailSaved ? "Saved" : "Save"}
          </Button>
          <Button onClick={() => setShowResetModal(true)} variant="outline" className="border-[#1a1a35] text-[#b0b0cc] hover:text-white text-sm h-10">
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
