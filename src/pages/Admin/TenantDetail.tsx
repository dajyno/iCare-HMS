import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, UserRound, Stethoscope, BedDouble, TrendingUp, DollarSign, Mail, Key, Loader2, AlertCircle, ExternalLink, CheckCircle2, Settings, Save, ChevronDown, Trash2 } from "lucide-react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Tenant } from "../../types/tenant";
import { ALL_MODULES, TIER_DISPLAY_NAMES, TIER_MODULE_DEFAULTS } from "../../lib/moduleAccess";

const CURRENCY = "\u20A6";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-300",
    Suspended: "bg-red-100 text-red-700 border-red-300",
  };
  return colors[status] || "bg-slate-100 text-slate-600";
};

const MiniMetricCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-3 transition-all duration-300 hover:border-blue-300 hover:shadow-md">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(37,99,235,0.12)]">
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
    </div>
    <p className="text-sm font-semibold text-slate-900">{value}</p>
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

  const [controlsOpen, setControlsOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingTenant, setDeletingTenant] = useState(false);

  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState("Standard");
  const [tierOptions, setTierOptions] = useState<{ name: string; monthly_price: number; max_staff_seats: number; max_bed_capacity: number }[]>([]);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const [changePlanError, setChangePlanError] = useState("");

  const [showAddFeaturesModal, setShowAddFeaturesModal] = useState(false);
  const [addFeaturesModules, setAddFeaturesModules] = useState<string[]>([]);
  const [addFeaturesLoading, setAddFeaturesLoading] = useState(false);
  const [addFeaturesError, setAddFeaturesError] = useState("");

  const [editHospitalName, setEditHospitalName] = useState("");
  const [editUrlSlug, setEditUrlSlug] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [identitySuccess, setIdentitySuccess] = useState("");

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
      setEditHospitalName(t.hospitalName);
      setEditUrlSlug(t.urlSlug);

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

  const handleSaveIdentity = async () => {
    if (!tenantId) return;
    setSavingIdentity(true);
    setIdentityError("");
    setIdentitySuccess("");

    const sanitizedSlug = editUrlSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!sanitizedSlug) {
      setIdentityError("URL slug cannot be empty");
      setSavingIdentity(false);
      return;
    }
    if (!editHospitalName.trim()) {
      setIdentityError("Hospital name cannot be empty");
      setSavingIdentity(false);
      return;
    }

    const { data: existing } = await adminSupabase
      .from("tenants")
      .select("tenant_id")
      .eq("url_slug", sanitizedSlug)
      .neq("tenant_id", tenantId)
      .maybeSingle();

    if (existing) {
      setIdentityError("This URL slug is already taken by another hospital");
      setSavingIdentity(false);
      return;
    }

    const { error } = await adminSupabase
      .from("tenants")
      .update({ hospital_name: editHospitalName.trim(), url_slug: sanitizedSlug })
      .eq("tenant_id", tenantId);

    if (error) {
      setIdentityError(error.message);
      setSavingIdentity(false);
      return;
    }

    // Sync the hospital name into global_settings so the dashboard shows it too
    const { data: curSettings } = await (adminSupabase as any)
      .from("global_settings")
      .select("settings")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (curSettings) {
      await (adminSupabase as any)
        .from("global_settings")
        .update({
          settings: { ...((curSettings as any).settings || {}), hospitalName: editHospitalName.trim() },
        })
        .eq("tenant_id", tenantId);
    }

    setSavingIdentity(false);
    setIdentitySuccess("Saved");
    setEditUrlSlug(sanitizedSlug);
    const { data: refreshed } = await adminSupabase.from("tenants").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (refreshed) setTenant(toCamel(refreshed) as Tenant);
    setTimeout(() => setIdentitySuccess(""), 3000);
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

  const handleDeleteTenant = async () => {
    if (!tenantId || !tenant) return;
    setDeletingTenant(true);

    const dataTables = [
      "global_settings",
      "users", "departments", "staff_profiles", "staff", "patients",
      "appointments", "consultations", "vital_signs", "prescriptions",
      "prescription_items", "medications", "lab_tests", "lab_requests",
      "lab_results", "invoices", "invoice_items", "payments",
      "inventory_items", "suppliers", "purchase_orders", "purchase_order_items",
      "wards", "beds", "admissions", "discharges", "radiology_categories",
      "radiology_exams", "radiology_requests", "radiology_results",
      "audit_logs", "notifications", "accounting_expenses",
      "accounting_income", "bank_accounts", "inpatient_vitals",
      "inpatient_medication_schedules", "inpatient_fluid_entries",
      "inpatient_clinical_notes",
    ];

    await Promise.allSettled(
      dataTables.map((t) =>
        (adminSupabase as any).from(t).delete().eq("tenant_id", tenantId)
      )
    );

    const { error } = await adminSupabase
      .from("tenants")
      .delete()
      .eq("tenant_id", tenantId);

    setDeletingTenant(false);

    if (error) {
      setDeleteConfirmInput(`Failed to delete: ${error.message}`);
      return;
    }

    navigate("/admin/tenants");
  };

  const openChangePlan = async () => {
    if (!tenant) return;
    const { data } = await adminSupabase.from("subscription_tiers").select("name, monthly_price, max_staff_seats, max_bed_capacity");
    setTierOptions(data || []);
    setSelectedTier(tenant.tier);
    setChangePlanError("");
    setShowChangePlanModal(true);
  };

  const handleChangePlan = async () => {
    if (!tenantId || !tenant) return;
    if (selectedTier === tenant.tier) { setShowChangePlanModal(false); return; }
    setChangePlanLoading(true);
    setChangePlanError("");

    const tierLimits: Record<string, { seats: number; beds: number }> = {
      Standard: { seats: 10, beds: 0 },
      Premium: { seats: 50, beds: 40 },
      Enterprise: { seats: 99999, beds: 99999 },
    };
    const limits = tierLimits[selectedTier] || tierLimits.Standard;

    const { error } = await adminSupabase.from("tenants").update({
      tier: selectedTier,
      max_staff_seats: limits.seats,
      max_bed_capacity: limits.beds,
      allowed_modules_override: null,
    }).eq("tenant_id", tenantId);

    if (error) {
      setChangePlanError(error.message);
      setChangePlanLoading(false);
      return;
    }

    setChangePlanLoading(false);
    setShowChangePlanModal(false);

    const { data: refreshed } = await adminSupabase.from("tenants").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (refreshed) setTenant(toCamel(refreshed) as Tenant);
  };

  const openAddFeatures = () => {
    if (!tenant) return;
    const overrideRaw = (tenant as any).allowedModulesOverride;
    const parsed: string[] = typeof overrideRaw === "string" ? JSON.parse(overrideRaw || "[]") : (overrideRaw ?? []);
    setAddFeaturesModules(parsed.length > 0 ? parsed : (TIER_MODULE_DEFAULTS[tenant.tier] ?? []));
    setAddFeaturesError("");
    setShowAddFeaturesModal(true);
  };

  const handleAddFeatures = async () => {
    if (!tenantId) return;
    setAddFeaturesLoading(true);
    setAddFeaturesError("");

    const { error } = await adminSupabase.from("tenants").update({
      allowed_modules_override: JSON.stringify(addFeaturesModules),
    }).eq("tenant_id", tenantId);

    if (error) {
      setAddFeaturesError(error.message);
      setAddFeaturesLoading(false);
      return;
    }

    setAddFeaturesLoading(false);
    setShowAddFeaturesModal(false);

    const { data: refreshed } = await adminSupabase.from("tenants").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (refreshed) setTenant(toCamel(refreshed) as Tenant);
  };

  const handleOpenDashboard = async () => {
    if (!tenant) return;
    const slug = tenant.urlSlug;
    const fallback = () => window.open(`/${slug}/login`, "_blank");
    const supabaseUrl = (window as any).ENV?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const anonKey = (window as any).ENV?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      // 1. Look for an existing HospitalAdmin user for this tenant
      const { data: admins } = await adminSupabase
        .from("users")
        .select("id, email, full_name")
        .eq("tenant_id", tenantId)
        .eq("role", "HospitalAdmin")
        .limit(1);

      let adminUser: any = admins?.[0] || null;
      let knownPassword = "";

      // 2. If no admin user found but admin_email is set, auto-provision one
      if (!adminUser && (tenant as any).adminEmail) {
        knownPassword = Math.random().toString(36).slice(2, 10) + "A1!";
        const { data: newAuth, error: createErr } = await (adminSupabase as any).auth.admin.createUser({
          email: (tenant as any).adminEmail,
          password: knownPassword,
          email_confirm: true,
          user_metadata: { full_name: `${tenant.hospitalName} Admin`, role: "HospitalAdmin" },
        });

        if (!createErr && newAuth?.user?.id) {
          const { error: insertErr } = await (adminSupabase as any).from("users").insert({
            id: newAuth.user.id,
            email: (tenant as any).adminEmail,
            tenant_id: tenantId,
            full_name: `${tenant.hospitalName} Admin`,
            role: "HospitalAdmin",
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (!insertErr) {
            adminUser = { id: newAuth.user.id, email: (tenant as any).adminEmail, full_name: `${tenant.hospitalName} Admin` } as any;
          }
        }
      }

      // 3. For existing users, set a temporary password to sign in
      if (adminUser?.id && !knownPassword) {
        knownPassword = Math.random().toString(36).slice(2, 10) + "A1!";
        const { error: updateErr } = await (adminSupabase as any).auth.admin.updateUserById(adminUser.id, {
          password: knownPassword,
        });
        if (updateErr) {
          fallback();
          return;
        }
      }

      // 4. Sign in via Supabase Auth REST API, then pass tokens to the auth callback page
      if (adminUser?.email && knownPassword) {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({ email: adminUser.email, password: knownPassword }),
        });

        if (res.ok) {
          const session = await res.json();
          const params = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            redirect_to: `/${slug}/dashboard`,
          });
          window.open(`${window.location.origin}/${slug}/auth/callback?${params}`, "_blank");
          return;
        }
      }
    } catch {
      // Fallback on any error
    }

    fallback();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !tenant) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Hospital Not Found</h2>
        <p className="text-sm text-slate-500">No tenant found with ID "{tenantId}"</p>
        <Button onClick={() => navigate("/admin/tenants")} className="mt-4 bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white">
          Back to Hospital Accounts
        </Button>
      </div>
    );
  }

  const mrr = tierMonthlyPrice;

  return (
    <div className="space-y-6">
      {/* Master Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tenants")} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{tenant.hospitalName}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(tenant.status)}`}>
              {tenant.status}
            </span>
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
              {tenant.tier}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-mono">{tenant.urlSlug}</span>
            <span className="mx-2">·</span>
            ID: {tenant.tenantId}
            <span className="mx-2">·</span>
            Created: {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Quick link */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-blue-600 hover:text-blue-700"
          onClick={handleOpenDashboard}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Open Hospital Dashboard
        </Button>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column — Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Admin Management */}
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            Admin Management
          </h2>
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin Email</Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); setEmailSaved(false); }}
                  placeholder="admin@hospital.com"
                  className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {emailError && <p className="text-[10px] text-red-500">{emailError}</p>}
              </div>
              <Button onClick={handleSaveAdminEmail} disabled={savingEmail} className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-sm h-10 text-white">
                {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {emailSaved ? "Saved" : "Save"}
              </Button>
              <Button onClick={() => setShowResetModal(true)} variant="outline" className="border-slate-300 text-slate-600 hover:text-slate-700 text-sm h-10">
                <Key className="w-3.5 h-3.5 mr-1.5" />
                Reset Password
              </Button>
            </div>
          </div>

          {/* Section: Hospital Identity */}
          <div className="bg-white border border-slate-100 rounded-xl">
            <button
              onClick={() => setIdentityOpen(!identityOpen)}
              className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Hospital Identity
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${identityOpen ? "rotate-180" : ""}`} />
            </button>
            {identityOpen && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Name</Label>
                    <Input
                      value={editHospitalName}
                      onChange={(e) => { setEditHospitalName(e.target.value); setIdentitySuccess(""); }}
                      className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">URL Slug</Label>
                    <Input
                      value={editUrlSlug}
                      onChange={(e) => { setEditUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setIdentitySuccess(""); }}
                      placeholder="my-hospital"
                      className="bg-white border-slate-300 text-slate-900 font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <Button onClick={handleSaveIdentity} disabled={savingIdentity} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm h-10">
                    {savingIdentity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {identitySuccess || "Save"}
                  </Button>
                </div>
                {identityError && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {identityError}
                  </div>
                )}
                {identitySuccess && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {identitySuccess}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Hospital Controls */}
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            Hospital Controls
          </h2>
          <div className="bg-white border border-slate-100 rounded-xl">
            <button
              onClick={() => setControlsOpen(!controlsOpen)}
              className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Actions
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${controlsOpen ? "rotate-180" : ""}`} />
            </button>
            {controlsOpen && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <Button onClick={openEditLimits} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm shadow-none">
                    Edit Limits
                  </Button>
                  <Button onClick={openChangePlan} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm shadow-none">
                    Change Plan
                  </Button>
                  {tenant.status === "Active" ? (
                    <Button onClick={() => handleStatusAction("Suspended")} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm shadow-none">
                      Suspend Account
                    </Button>
                  ) : (
                    <Button onClick={() => handleStatusAction("Active")} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm shadow-none">
                      Reactivate Account
                    </Button>
                  )}
                  <Button onClick={openAddFeatures} className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm shadow-none">
                    Add Features
                  </Button>
                  <Button onClick={() => setShowDeleteModal(true)} className="bg-red-600 hover:bg-red-700 text-white text-sm shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Metrics Overview */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Hospital Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetricCard icon={Users} label="System Users" value={String(usersCount)} />
            <MiniMetricCard icon={Stethoscope} label="Doctors" value={String(doctorsCount)} />
            <MiniMetricCard icon={UserRound} label="Patients" value={String(patientsCount)} />
            <MiniMetricCard icon={BedDouble} label="Beds" value={String(bedsCount)} />
          </div>
          <MiniMetricCard icon={TrendingUp} label="Monthly Contribution" value={`${CURRENCY}${mrr.toLocaleString()}`} />
          <MiniMetricCard icon={DollarSign} label="Annual Contribution" value={`${CURRENCY}${(mrr * 12).toLocaleString()}`} />
        </div>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={showResetModal} onOpenChange={(o) => { if (!o) { setShowResetModal(false); setPasswordError(""); setPasswordSuccess(""); setNewPassword(""); setConfirmPassword(""); }}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Reset Password</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Set a new password for {tenant.hospitalName}'s admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {passwordSuccess}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowResetModal(false); setPasswordError(""); setPasswordSuccess(""); setNewPassword(""); setConfirmPassword(""); }} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword} className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white">
              {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limits Modal */}
      <Dialog open={showLimitsModal} onOpenChange={(o) => { if (!o) { setShowLimitsModal(false); setLimitsError(""); }}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Limits — {tenant.hospitalName}</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Override subscription limits for this hospital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {limitsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {limitsError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Staff Seats</Label>
              <Input
                type="number" min={0}
                value={editStaffSeats}
                onChange={(e) => setEditStaffSeats(parseInt(e.target.value) || 0)}
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Bed Capacity</Label>
              <Input
                type="number" min={0}
                value={editBedCapacity}
                onChange={(e) => setEditBedCapacity(parseInt(e.target.value) || 0)}
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Module Override</Label>
                <button
                  onClick={() => setEditModuleOverride(!editModuleOverride)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editModuleOverride ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editModuleOverride ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {editModuleOverride && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {ALL_MODULES.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editModules.includes(mod)}
                        onChange={(e) => {
                          if (e.target.checked) setEditModules([...editModules, mod]);
                          else setEditModules(editModules.filter((m) => m !== mod));
                        }}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      {mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              )}
              {!editModuleOverride && (
                <p className="text-[10px] text-slate-400">Using tier defaults. Toggle override to customize.</p>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowLimitsModal(false); setLimitsError(""); }} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleSaveLimits} disabled={savingLimits} className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white">
              {savingLimits ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(o) => { if (!o) { setShowDeleteModal(false); setDeleteConfirmInput(""); }}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Hospital Account
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs space-y-2">
              <p>This will permanently delete <span className="text-slate-900 font-bold">{tenant.hospitalName}</span> and <span className="text-red-600 font-bold">all associated data</span> across every module.</p>
              <p className="text-red-600/80 font-medium">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {deleteConfirmInput && deleteConfirmInput.startsWith("Failed to delete") && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {deleteConfirmInput}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Type <span className="text-slate-900">"{tenant.hospitalName}"</span> to confirm
              </Label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={tenant.hospitalName}
                className="bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowDeleteModal(false); setDeleteConfirmInput(""); }} className="text-slate-500">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTenant}
              disabled={deletingTenant || deleteConfirmInput !== tenant.hospitalName}
              className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            >
              {deletingTenant ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              {deletingTenant ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={showChangePlanModal} onOpenChange={(o) => { if (!o) { setShowChangePlanModal(false); setChangePlanError(""); }}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Change Plan — {tenant.hospitalName}</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Select a new subscription plan. Changing plan will reset module overrides to the new plan's defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {changePlanError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {changePlanError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {["Standard", "Premium", "Enterprise"].map((tier) => {
                const option = tierOptions.find((o) => o.name === tier);
                const isCurrent = tenant?.tier === tier;
                const isSelected = selectedTier === tier;
                const displayName = TIER_DISPLAY_NAMES[tier] || tier;
                const modules = TIER_MODULE_DEFAULTS[tier] ?? [];
                const seats = option?.max_staff_seats ?? (tier === "Standard" ? 10 : tier === "Premium" ? 50 : 99999);
                const beds = option?.max_bed_capacity ?? (tier === "Standard" ? 0 : tier === "Premium" ? 40 : 99999);
                const price = option?.monthly_price ?? 0;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-purple-400 bg-purple-50 shadow-[0_0_16px_rgba(147,51,234,0.1)]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        Current
                      </span>
                    )}
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm">{displayName}</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{tier}</p>
                      <p className="text-lg font-bold text-blue-600">
                        {CURRENCY}{(price || 0).toLocaleString()}<span className="text-xs text-slate-500 font-normal">/mo</span>
                      </p>
                      <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                        <p>{seats >= 99999 ? "Unlimited" : seats} staff seats</p>
                        <p>{beds >= 99999 ? "Unlimited" : beds} bed capacity</p>
                        <p className="pt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Modules</p>
                        <ul className="space-y-0.5">
                          {modules.map((m) => (
                            <li key={m} className="flex items-center gap-1.5">
                              <span className="text-emerald-500 text-[10px]">✓</span>
                              {m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedTier !== tenant?.tier && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {tenant?.tier && TIER_MODULE_DEFAULTS[selectedTier] && TIER_MODULE_DEFAULTS[tenant.tier]
                  ? (() => {
                      const lostModules = TIER_MODULE_DEFAULTS[tenant.tier].filter(
                        (m) => !TIER_MODULE_DEFAULTS[selectedTier].includes(m)
                      );
                      return lostModules.length > 0
                        ? `Downgrading will disable: ${lostModules.map((m) => m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")}. Module overrides will be reset.`
                        : "Module overrides will be reset when changing plans.";
                    })()
                  : "Module overrides will be reset when changing plans."}
              </div>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowChangePlanModal(false); setChangePlanError(""); }} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleChangePlan} disabled={changePlanLoading || selectedTier === tenant?.tier} className="bg-purple-600 hover:bg-purple-700 shadow-[0_0_12px_rgba(147,51,234,0.2)] text-white">
              {changePlanLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {changePlanLoading ? "Changing..." : "Change Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Features Modal */}
      <Dialog open={showAddFeaturesModal} onOpenChange={(o) => { if (!o) { setShowAddFeaturesModal(false); setAddFeaturesError(""); }}}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Add Features — {tenant.hospitalName}</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Individually enable or disable modules for this hospital.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {addFeaturesError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {addFeaturesError}
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-medium">
              {tenant?.tier && (
                <>Default modules for {TIER_DISPLAY_NAMES[tenant.tier]}: <span className="text-slate-600">{TIER_MODULE_DEFAULTS[tenant.tier]?.map((m) => m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ") || "None"}</span></>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((mod) => {
                const isDefaultForTier = tenant?.tier && (TIER_MODULE_DEFAULTS[tenant.tier] ?? []).includes(mod);
                return (
                  <label
                    key={mod}
                    className={`flex items-center gap-2 text-xs rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      addFeaturesModules.includes(mod)
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={addFeaturesModules.includes(mod)}
                      onChange={(e) => {
                        if (e.target.checked) setAddFeaturesModules([...addFeaturesModules, mod]);
                        else setAddFeaturesModules(addFeaturesModules.filter((m) => m !== mod));
                      }}
                      className="rounded border-slate-300 text-teal-600"
                    />
                    <div className="flex-1">
                      <span>{mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                      {isDefaultForTier && (
                        <span className="ml-1.5 text-[9px] text-emerald-600 font-medium">(included)</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (tenant?.tier) {
                  setAddFeaturesModules(TIER_MODULE_DEFAULTS[tenant.tier] ?? []);
                }
              }}
              className="text-slate-500 hover:text-slate-700 text-xs"
            >
              Reset to {tenant?.tier ? TIER_DISPLAY_NAMES[tenant.tier] : "Tier"} Defaults
            </Button>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowAddFeaturesModal(false); setAddFeaturesError(""); }} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleAddFeatures} disabled={addFeaturesLoading} className="bg-teal-600 hover:bg-teal-700 shadow-[0_0_12px_rgba(20,184,166,0.2)] text-white">
              {addFeaturesLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {addFeaturesLoading ? "Saving..." : "Save Features"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantDetail;
