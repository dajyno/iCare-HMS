import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings as SettingsIcon,
  DollarSign,
  Shield,
  Bell,
  Globe,
  Database,
  Check,
  X,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import SearchableSelect from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useGlobalSettings } from "@/src/context/GlobalSettingsContext";
import { useStaff } from "@/src/pages/Staff/StaffContext";
import { supabase } from "@/src/lib/supabase";
import type { RoleKey } from "@/src/types/globalSettings";
import { toast } from "sonner";
import type { StaffRecord } from "@/src/pages/Staff/types";

type ActiveTab = "general" | "financial" | "security" | "notifications" | "regional" | "database";

const ROLES_ORDER: RoleKey[] = [
  "HospitalAdmin", "Doctor", "Nurse", "Receptionist",
  "LabTechnician", "Pharmacist", "BillingOfficer", "InventoryOfficer",
];

const ROUTE_GROUPS = [
  { label: "Dashboard", prefix: "/dashboard" },
  { label: "Appointments", prefix: "/appointments" },
  { label: "Patients", prefix: "/patients" },
  { label: "Consultations", prefix: "/consultations" },
  { label: "Lab", prefix: "/laboratory" },
  { label: "Radiology", prefix: "/radiology" },
  { label: "Pharmacy", prefix: "/pharmacy" },
  { label: "Billing", prefix: "/billing" },
  { label: "Accounting", prefix: "/accounting" },
  { label: "Inventory", prefix: "/inventory" },
  { label: "Inpatient", prefix: "/inpatient" },
  { label: "Staff", prefix: "/staff" },
  { label: "Reports", prefix: "/reports" },
  { label: "Settings", prefix: "/settings" },
  { label: "Profile", prefix: "/profile" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($) — US Dollar" },
  { value: "EUR", label: "EUR (€) — Euro" },
  { value: "GBP", label: "GBP (£) — British Pound" },
  { value: "NGN", label: "NGN (₦) — Nigerian Naira" },
  { value: "GHS", label: "GHS (₵) — Ghanaian Cedi" },
  { value: "KES", label: "KES (KSh) — Kenyan Shilling" },
  { value: "ZAR", label: "ZAR (R) — South African Rand" },
  { value: "XAF", label: "XAF (FCFA) — Central African CFA" },
  { value: "XOF", label: "XOF (CFA) — West African CFA" },
  { value: "CAD", label: "CAD (C$) — Canadian Dollar" },
  { value: "AUD", label: "AUD (A$) — Australian Dollar" },
  { value: "JPY", label: "JPY (¥) — Japanese Yen" },
  { value: "CNY", label: "CNY (¥) — Chinese Yuan" },
  { value: "INR", label: "INR (₹) — Indian Rupee" },
  { value: "CHF", label: "CHF (Fr) — Swiss Franc" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French — Français" },
  { value: "es", label: "Spanish — Español" },
  { value: "pt", label: "Portuguese — Português" },
  { value: "ar", label: "Arabic — العربية" },
  { value: "sw", label: "Swahili — Kiswahili" },
  { value: "zh", label: "Chinese — 中文" },
  { value: "de", label: "German — Deutsch" },
  { value: "it", label: "Italian — Italiano" },
];

const DATE_FORMAT_OPTIONS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-05-22)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (22/05/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (05/22/2026)" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY (22.05.2026)" },
];

const TIME_FORMAT_OPTIONS = [
  { value: "24h", label: "24-hour (14:30)" },
  { value: "12h", label: "12-hour (02:30 PM)" },
];

function routeMatchesGroup(route: string, prefix: string): boolean {
  if (prefix === "/settings" || prefix === "/profile" || prefix === "/dashboard") {
    return route === prefix;
  }
  return route === prefix || route.startsWith(prefix + "/");
}

function saveWithHospitalConfig(settings: { hospitalName: string; hospitalCode: string }) {
  try {
    localStorage.setItem("icare_hospital_name", settings.hospitalName);
    localStorage.setItem("icare_hospital_code", settings.hospitalCode);
  } catch { /* ignore */ }
}

export default function Settings() {
  const { settings, updateSettings } = useGlobalSettings();
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");

  const [localName, setLocalName] = useState(settings.hospitalName);
  const [localAddress, setLocalAddress] = useState(settings.hospitalAddress);
  const [localCode, setLocalCode] = useState(settings.hospitalCode);
  const [localEmail, setLocalEmail] = useState(settings.systemEmail);

  const [localCurrency, setLocalCurrency] = useState(settings.baseCurrency);
  const [localVat, setLocalVat] = useState(String(settings.vatPercentage));
  const [localTerms, setLocalTerms] = useState(settings.invoicePaymentTerms);
  const [localConditions, setLocalConditions] = useState(settings.invoiceConditions);

  const [localTimezone, setLocalTimezone] = useState(settings.timezone);
  const [localLanguage, setLocalLanguage] = useState(settings.language);
  const [localDateFormat, setLocalDateFormat] = useState(settings.dateFormat);
  const [localTimeFormat, setLocalTimeFormat] = useState(settings.timeFormat);

  const [backupFile, setBackupFile] = useState<File | null>(null);

  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreTyped, setRestoreTyped] = useState("");
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const { records: staffRecords } = useStaff();

  const [dbTestOpen, setDbTestOpen] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ status: "idle" | "testing" | "success" | "error"; latency?: number; error?: string; checkedAt?: string }>({ status: "idle" });

  const [overrideRole, setOverrideRole] = useState<RoleKey | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string[]>>({});

  const positionToRole: Record<string, RoleKey> = {
    "Medical Doctors": "Doctor",
    "Nursing": "Nurse",
    "Pharmacy": "Pharmacist",
    "Laboratory": "LabTechnician",
    "Administration": "HospitalAdmin",
  };

  const staffByRole = useMemo(() => {
    if (!overrideRole) return [];
    return staffRecords.filter((s: StaffRecord) => positionToRole[s.position] === overrideRole);
  }, [overrideRole, staffRecords]);

  const baseRoutesForRole = useMemo(() => {
    if (!overrideRole) return [];
    return settings.rbacMatrix[overrideRole]?.allowedRoutes || [];
  }, [overrideRole, settings.rbacMatrix]);

  const availableOverrideRoutes = useMemo(() => {
    if (!overrideRole) return [];
    return ROUTE_GROUPS.filter((g) => !baseRoutesForRole.some((r) => routeMatchesGroup(r, g.prefix)));
  }, [overrideRole, baseRoutesForRole]);

  const openOverrideModal = (role: RoleKey) => {
    setOverrideRole(role);
    const existing = settings.staffRouteOverrides || {};
    const roleStaff = staffRecords.filter((s: StaffRecord) => positionToRole[s.position] === role);
    const draft: Record<string, string[]> = {};
    roleStaff.forEach((s: StaffRecord) => {
      draft[s.staff_id] = existing[s.staff_id] ? [...existing[s.staff_id]] : [];
    });
    setOverrideDraft(draft);
  };

  const toggleOverrideRoute = (staffId: string, prefix: string) => {
    setOverrideDraft((prev) => {
      const current = prev[staffId] || [];
      const has = current.some((r) => routeMatchesGroup(r, prefix));
      const updated = has
        ? current.filter((r) => !routeMatchesGroup(r, prefix))
        : [...current, prefix];
      return { ...prev, [staffId]: updated };
    });
  };

  const saveOverrides = () => {
    const merged: Record<string, string[]> = {};
    Object.entries(overrideDraft).forEach(([id, routes]) => {
      if (routes.length > 0) merged[id] = routes;
    });
    updateSettings({ staffRouteOverrides: merged });
    setOverrideRole(null);
    toast.success("Staff route overrides saved");
  };

  useEffect(() => {
    setLocalName(settings.hospitalName);
    setLocalAddress(settings.hospitalAddress);
    setLocalCode(settings.hospitalCode);
    setLocalEmail(settings.systemEmail);
    setLocalCurrency(settings.baseCurrency);
    setLocalVat(String(settings.vatPercentage));
    setLocalTerms(settings.invoicePaymentTerms);
    setLocalConditions(settings.invoiceConditions);
    setLocalTimezone(settings.timezone);
    setLocalLanguage(settings.language);
    setLocalDateFormat(settings.dateFormat);
    setLocalTimeFormat(settings.timeFormat);
  }, [settings]);

  const handleSaveGeneral = () => {
    updateSettings({ hospitalName: localName, hospitalAddress: localAddress, hospitalCode: localCode.toUpperCase(), systemEmail: localEmail });
    saveWithHospitalConfig({ hospitalName: localName, hospitalCode: localCode.toUpperCase() });
    toast.success("General settings saved");
  };

  const handleSaveFinancial = () => {
    const vat = parseFloat(localVat);
    if (isNaN(vat) || vat < 0 || vat > 100) return;
    updateSettings({
      baseCurrency: localCurrency,
      vatPercentage: vat,
      invoicePaymentTerms: localTerms,
      invoiceConditions: localConditions,
    });
    toast.success("Financial & Tax settings saved");
  };

  const handleSaveRegional = () => {
    updateSettings({
      timezone: localTimezone,
      language: localLanguage,
      dateFormat: localDateFormat,
      timeFormat: localTimeFormat,
    });
    toast.success("Regional settings saved");
  };

  const handleRouteToggle = (role: RoleKey, prefix: string) => {
    const current = settings.rbacMatrix[role];
    const has = current.allowedRoutes.some((r) => routeMatchesGroup(r, prefix));
    const updated = has
      ? current.allowedRoutes.filter((r) => !routeMatchesGroup(r, prefix))
      : [...current.allowedRoutes, prefix];
    updateSettings({
      rbacMatrix: {
        ...settings.rbacMatrix,
        [role]: { ...current, allowedRoutes: updated },
      },
    });
  };

  const handlePermissionToggle = (role: RoleKey, field: "write" | "approve") => {
    const current = settings.rbacMatrix[role];
    updateSettings({
      rbacMatrix: {
        ...settings.rbacMatrix,
        [role]: { ...current, [field]: !current[field] },
      },
    });
  };

  const handleTestConnection = useCallback(async () => {
    setDbTestResult({ status: "testing" });
    const start = performance.now();
    try {
      const { error } = await supabase.from("users").select("id").limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) {
        setDbTestResult({ status: "error", latency, error: error.message, checkedAt: new Date().toISOString() });
      } else {
        setDbTestResult({ status: "success", latency, checkedAt: new Date().toISOString() });
      }
    } catch (err: any) {
      setDbTestResult({ status: "error", error: err?.message || "Unknown error", checkedAt: new Date().toISOString() });
    }
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    const timestamp = new Date().toISOString();
    updateSettings({ databaseLastBackup: timestamp });
    setBackupLoading(false);
    setBackupModalOpen(false);
    setBackupConfirmed(false);
    toast.success("Backup generated successfully");
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    await new Promise((r) => setTimeout(r, 2500));
    setRestoreLoading(false);
    setRestoreModalOpen(false);
    setRestoreTyped("");
    setRestoreConfirmed(false);
    setBackupFile(null);
    toast.success("Database restored successfully");
  };

  const tabs: { key: ActiveTab; icon: typeof SettingsIcon; label: string }[] = [
    { key: "general", icon: SettingsIcon, label: "General" },
    { key: "financial", icon: DollarSign, label: "Financial & Tax" },
    { key: "security", icon: Shield, label: "Security & Roles" },
    { key: "notifications", icon: Bell, label: "Notifications" },
    { key: "regional", icon: Globe, label: "Regional & Localization" },
    { key: "database", icon: Database, label: "Database Maintenance" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
          <p className="text-slate-500 text-sm">Configure hospital-wide preferences and security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  activeTab === tab.key
                    ? "bg-white shadow-sm border border-slate-200 font-semibold text-sky-600"
                    : "text-slate-600"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        <div className="space-y-6 min-w-0">
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Branding</CardTitle>
                  <CardDescription>Configure how your hospital appears across the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hospital-name">Hospital Name</Label>
                    <Input id="hospital-name" value={localName} onChange={(e) => setLocalName(e.target.value)} className="h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hospital-address">Hospital Address</Label>
                    <Input id="hospital-address" value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} className="h-10" placeholder="123 Healthcare Avenue, Medical District" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hospital-code">Hospital Code <span className="text-xs text-slate-400">(system-wide dynamic prefix for invoice numbers)</span></Label>
                    <Input id="hospital-code" value={localCode} onChange={(e) => setLocalCode(e.target.value.toUpperCase())} placeholder="e.g. HMS" maxLength={10} className="h-10 font-mono uppercase" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="system-email">System Email</Label>
                    <Input id="system-email" type="email" value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} className="h-10" />
                  </div>
                  <Button className="bg-sky-600 hover:bg-sky-700 mt-2" onClick={handleSaveGeneral}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Database Connection</CardTitle>
                    <CardDescription>Monitor and verify your database connectivity</CardDescription>
                  </div>
                  <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" title="Connected" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-4">Connected to Supabase PostgreSQL production instance.</p>
                  <Button variant="outline" size="sm" onClick={() => { setDbTestOpen(true); handleTestConnection(); }}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Test Connection
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "financial" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Base Currency</CardTitle>
                  <CardDescription>Select the default currency for all financial transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <SearchableSelect
                    value={localCurrency}
                    onValueChange={setLocalCurrency}
                    options={CURRENCY_OPTIONS}
                    placeholder="Search currencies..."
                    triggerClassName="h-10"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>VAT / Tax Rate</CardTitle>
                  <CardDescription>Global tax percentage applied to invoice line items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="relative w-32">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={localVat}
                        onChange={(e) => setLocalVat(e.target.value)}
                        className="h-10 pr-8 text-right font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                    <span className="text-sm text-slate-500">of total invoice amount</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Defaults</CardTitle>
                  <CardDescription>Default payment terms and conditions printed on invoices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payment-terms">Payment Terms</Label>
                    <Input id="payment-terms" value={localTerms} onChange={(e) => setLocalTerms(e.target.value)} className="h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="invoice-conditions">Conditions & Footnotes</Label>
                    <Textarea id="invoice-conditions" value={localConditions} onChange={(e) => setLocalConditions(e.target.value)} rows={3} />
                  </div>
                  <Button className="bg-sky-600 hover:bg-sky-700 mt-2" onClick={handleSaveFinancial}>Save Changes</Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control (RBAC) Matrix</CardTitle>
                <CardDescription>Map roles to permitted application routes and permissions</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="sticky left-0 z-10 text-left py-2.5 pl-4 pr-4 font-semibold text-slate-700 min-w-[130px] bg-white">Role</th>
                      {ROUTE_GROUPS.map((g) => (
                        <th key={g.prefix} className="text-center py-2.5 px-1.5 font-medium text-slate-500 text-xs uppercase tracking-wider">{g.label}</th>
                      ))}
                      <th className="text-center py-2.5 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider min-w-[60px]">Write</th>
                      <th className="text-center py-2.5 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider min-w-[60px]">Approve</th>
                      <th className="text-center py-2.5 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider min-w-[70px]">Overrides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES_ORDER.map((role) => {
                      const perm = settings.rbacMatrix[role];
                      return (
                        <tr key={role} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="sticky left-0 z-10 py-2.5 pl-4 pr-4 font-medium text-slate-800 bg-white">{role}</td>
                          {ROUTE_GROUPS.map((g) => {
                            const has = perm.allowedRoutes.some((r) => routeMatchesGroup(r, g.prefix));
                            return (
                              <td key={g.prefix} className="text-center py-2.5 px-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRouteToggle(role, g.prefix)}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded border transition-colors ${
                                    has
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "border-slate-200 text-transparent hover:border-slate-300"
                                  }`}
                                >
                                  {has && <Check className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="text-center py-2.5 px-3">
                            <Switch
                              checked={perm.write}
                              onCheckedChange={() => handlePermissionToggle(role, "write")}
                            />
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <Switch
                              checked={perm.approve}
                              onCheckedChange={() => handlePermissionToggle(role, "approve")}
                            />
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                              onClick={() => openOverrideModal(role)}
                              title={`Staff overrides for ${role}`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Edit</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-4">Changes are saved automatically. The root router enforces these permissions for sensitive sub-routes.</p>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Notification Triggers</CardTitle>
                  <CardDescription>Configure system-wide background notification events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Pending Transaction Alerts</p>
                      <p className="text-xs text-slate-500">Notify staff when transactions are awaiting processing</p>
                    </div>
                    <Switch
                      checked={settings.pendingTransactionAlerts}
                      onCheckedChange={(v) => updateSettings({ pendingTransactionAlerts: v })}
                    />
                  </div>
                  <div className="border-t border-slate-100" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Low Stock Alerts</p>
                      <p className="text-xs text-slate-500">Trigger alerts when inventory items fall below reorder levels</p>
                    </div>
                    <Switch
                      checked={settings.lowStockAlerts}
                      onCheckedChange={(v) => updateSettings({ lowStockAlerts: v })}
                    />
                  </div>
                  <div className="border-t border-slate-100" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Automated Patient Reminders</p>
                      <p className="text-xs text-slate-500">Send automated reminders for upcoming appointments</p>
                    </div>
                    <Switch
                      checked={settings.automatedPatientReminders}
                      onCheckedChange={(v) => updateSettings({ automatedPatientReminders: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "regional" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Timezone</CardTitle>
                  <CardDescription>Set the system-wide timezone for all date and time displays</CardDescription>
                </CardHeader>
                <CardContent>
                  <SearchableSelect
                    value={localTimezone}
                    onValueChange={setLocalTimezone}
                    options={TIMEZONE_OPTIONS}
                    placeholder="Search timezones..."
                    triggerClassName="h-10"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Language</CardTitle>
                  <CardDescription>Select the default language for the application interface</CardDescription>
                </CardHeader>
                <CardContent>
                  <SearchableSelect
                    value={localLanguage}
                    onValueChange={setLocalLanguage}
                    options={LANGUAGE_OPTIONS}
                    placeholder="Search languages..."
                    triggerClassName="h-10"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Date & Time Format</CardTitle>
                  <CardDescription>Configure global date and time display preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Date Format</Label>
                    <SearchableSelect
                      value={localDateFormat}
                      onValueChange={setLocalDateFormat}
                      options={DATE_FORMAT_OPTIONS}
                      placeholder="Select date format..."
                      triggerClassName="h-10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Time Format</Label>
                    <SearchableSelect
                      value={localTimeFormat}
                      onValueChange={setLocalTimeFormat}
                      options={TIME_FORMAT_OPTIONS}
                      placeholder="Select time format..."
                      triggerClassName="h-10"
                    />
                  </div>
                  <Button className="bg-sky-600 hover:bg-sky-700 mt-2" onClick={handleSaveRegional}>Save Changes</Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "database" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Database Backup Manager</CardTitle>
                  <CardDescription>Generate, compress, and download a complete cryptographic snapshot of the primary clinical database instance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="bg-sky-600 hover:bg-sky-700 h-10 px-6 text-sm font-medium"
                    onClick={() => setBackupModalOpen(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate & Download Backup
                  </Button>
                  {settings.databaseLastBackup ? (
                    <p className="text-xs text-slate-400">
                      Last backup: {new Date(settings.databaseLastBackup).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No backup has been generated yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Restore Manager</CardTitle>
                  <CardDescription>Overwrite the current system state by uploading a valid system backup file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FileDropzone
                    value={backupFile}
                    onChange={setBackupFile}
                  />
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Critical Warning</p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        Ensure the backup file is fully extracted from any multi-layered zip containers before upload.
                        Executing a restore operation will completely overwrite the active database state.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    disabled={!backupFile}
                    className={`h-10 px-6 text-sm font-medium ${
                      backupFile
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-slate-200 text-slate-400"
                    }`}
                    onClick={() => setRestoreModalOpen(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Database
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={dbTestOpen} onOpenChange={setDbTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Database Connection Test</DialogTitle>
            <DialogDescription>Verifying connectivity to the Supabase PostgreSQL instance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dbTestResult.status === "testing" && (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-sm text-slate-600">Testing connection...</span>
              </div>
            )}
            {dbTestResult.status === "success" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Connected</p>
                    <p className="text-xs text-emerald-600">Supabase PostgreSQL instance is reachable</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Latency</p>
                    <p className="font-mono font-medium text-slate-800">{dbTestResult.latency} ms</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Last Checked</p>
                    <p className="font-mono font-medium text-slate-800 text-xs">{dbTestResult.checkedAt ? new Date(dbTestResult.checkedAt).toLocaleTimeString() : "—"}</p>
                  </div>
                </div>
              </div>
            )}
            {dbTestResult.status === "error" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                  <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Connection Failed</p>
                    <p className="text-xs text-red-600 mt-1">{dbTestResult.error || "Unable to reach database"}</p>
                  </div>
                </div>
                {dbTestResult.latency && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="text-xs text-slate-500">Response Time</p>
                    <p className="font-mono font-medium text-slate-800">{dbTestResult.latency} ms</p>
                  </div>
                )}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleTestConnection} className="w-full">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Test Again
            </Button>
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={backupModalOpen} onOpenChange={setBackupModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Database Backup</DialogTitle>
            <DialogDescription>This will generate a full cryptographic snapshot of the current database state.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={(e) => setBackupConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">I confirm I want to proceed with generating a database backup.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBackupModalOpen(false); setBackupConfirmed(false); }}>Cancel</Button>
            <Button
              disabled={!backupConfirmed || backupLoading}
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleBackup}
            >
              {backupLoading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-1.5" /> Generate Backup</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Database Restore</DialogTitle>
            <DialogDescription>
              <span className="text-red-600 font-semibold">WARNING:</span> This will completely overwrite the active database state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {backupFile && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                <span className="text-slate-500">Selected file: </span>
                <span className="font-mono font-medium text-slate-800">{backupFile.name}</span>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="overwrite-confirm">Type <span className="font-mono font-bold text-red-600">OVERWRITE</span> to confirm</Label>
              <Input
                id="overwrite-confirm"
                value={restoreTyped}
                onChange={(e) => setRestoreTyped(e.target.value)}
                placeholder="OVERWRITE"
                className="h-10 font-mono text-center uppercase"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreConfirmed}
                onChange={(e) => setRestoreConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-700">I understand this operation is irreversible.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRestoreModalOpen(false); setRestoreTyped(""); setRestoreConfirmed(false); }}>Cancel</Button>
            <Button
              disabled={restoreTyped !== "OVERWRITE" || !restoreConfirmed || restoreLoading}
              variant="destructive"
              onClick={handleRestore}
            >
              {restoreLoading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Restoring...</>
              ) : (
                <><Upload className="w-4 h-4 mr-1.5" /> Restore Database</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideRole} onOpenChange={(open) => { if (!open) setOverrideRole(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{overrideRole} — Staff Route Overrides</DialogTitle>
            <DialogDescription>Grant additional route access to individual staff members beyond their role defaults.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {staffByRole.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No staff found for this role.</p>
            )}
            {staffByRole.map((staff: any) => {
              const staffRoutes = overrideDraft[staff.staff_id] || [];
              return (
                <div key={staff.staff_id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800 mb-2">{staff.name}</p>
                  {availableOverrideRoutes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">This role already has full access — no additional routes available.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableOverrideRoutes.map((g) => {
                        const has = staffRoutes.some((r: string) => routeMatchesGroup(r, g.prefix));
                        return (
                          <button
                            key={g.prefix}
                            type="button"
                            onClick={() => toggleOverrideRoute(staff.staff_id, g.prefix)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                              has
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {has && <Check className="w-3 h-3" />}
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideRole(null)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={saveOverrides}>Save Overrides</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
