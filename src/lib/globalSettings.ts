import type { GlobalSettings, RoleKey, RolePermissions } from "@/src/types/globalSettings";

const STORAGE_KEY = "icare_global_settings";

const ALL_ROUTES = [
  "/dashboard",
  "/appointments",
  "/patients",
  "/consultations",
  "/consultations/vitals",
  "/laboratory",
  "/radiology",
  "/pharmacy/prescriptions",
  "/pharmacy/inventory",
  "/pharmacy/analytics",
  "/billing",
  "/accounting",
  "/accounting/registries",
  "/accounting/ledger",
  "/accounting/banks",
  "/accounting/reports",
  "/inventory",
  "/inpatient",
  "/staff",
  "/reports",
  "/reports/clinical",
  "/settings",
  "/profile",
] as const;

function fullAccess(): RolePermissions {
  return { allowedRoutes: [...ALL_ROUTES], write: true, approve: true };
}

function noAccess(): RolePermissions {
  return { allowedRoutes: [], write: false, approve: false };
}

function routeAccess(...routes: string[]): RolePermissions {
  return { allowedRoutes: [...routes], write: true, approve: false };
}

function defaultRbacMatrix(): Record<RoleKey, RolePermissions> {
  return {
    SuperAdmin: fullAccess(),
    HospitalAdmin: fullAccess(),
    Doctor: routeAccess(
      "/dashboard", "/appointments", "/patients", "/consultations",
      "/consultations/vitals", "/laboratory", "/radiology",
      "/pharmacy/prescriptions", "/billing", "/reports/clinical", "/profile"
    ),
    Nurse: routeAccess(
      "/dashboard", "/appointments", "/patients", "/consultations/vitals",
      "/inpatient", "/profile"
    ),
    Receptionist: routeAccess(
      "/dashboard", "/appointments", "/patients", "/billing", "/profile"
    ),
    LabTechnician: routeAccess(
      "/dashboard", "/laboratory", "/profile"
    ),
    Pharmacist: routeAccess(
      "/dashboard", "/pharmacy/prescriptions", "/pharmacy/inventory",
      "/pharmacy/analytics", "/profile"
    ),
    BillingOfficer: routeAccess(
      "/dashboard", "/billing", "/accounting", "/accounting/registries",
      "/accounting/ledger", "/accounting/banks", "/accounting/reports", "/profile"
    ),
    InventoryOfficer: routeAccess(
      "/dashboard", "/inventory", "/pharmacy/inventory", "/profile"
    ),
  };
}

export function getDefaultSettings(): GlobalSettings {
  return {
    hospitalName: "iCare Medical Center",
    hospitalAddress: "123 Healthcare Avenue, Medical District",
    hospitalCode: "HMS",
    systemEmail: "admin@icare.com",
    databaseLastBackup: null,

    baseCurrency: "USD",
    vatPercentage: 7.5,
    invoicePaymentTerms: "Payment is due within 30 days from the date of invoice.",
    invoiceConditions: "All prices are in the stated currency. Late payments may incur additional charges.",

    rbacMatrix: defaultRbacMatrix(),
    staffRouteOverrides: {},

    pendingTransactionAlerts: true,
    lowStockAlerts: true,
    automatedPatientReminders: false,

    timezone: "UTC",
    language: "en",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
  };
}

export function loadSettings(): GlobalSettings {
  if (typeof window === "undefined") return getDefaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    const defaults = getDefaultSettings();
    return { ...defaults, ...parsed };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings: GlobalSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
