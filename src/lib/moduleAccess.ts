import type { Tenant } from "@/src/types/tenant";

export type AllowedModule =
  | "emr"
  | "reception"
  | "billing"
  | "pharmacy"
  | "laboratory"
  | "hmo_insurance"
  | "multi_branch"
  | "human_resources"
  | "accounting";

export const ALL_MODULES: AllowedModule[] = [
  "emr",
  "reception",
  "billing",
  "pharmacy",
  "laboratory",
  "hmo_insurance",
  "multi_branch",
  "human_resources",
  "accounting",
];

export const TIER_MODULE_DEFAULTS: Record<string, AllowedModule[]> = {
  Standard: ["emr", "reception", "billing"],
  Premium: ["emr", "reception", "billing", "pharmacy", "laboratory", "hmo_insurance"],
  Enterprise: [
    "emr", "reception", "billing", "pharmacy", "laboratory",
    "hmo_insurance", "multi_branch", "human_resources", "accounting",
  ],
};

export const TIER_DISPLAY_NAMES: Record<string, string> = {
  Standard: "Clinic Starter",
  Premium: "Hospital Pro",
  Enterprise: "Enterprise Network",
};

export const TIER_REQUIRED_FOR_MODULE: Record<string, string> = {
  pharmacy: "Hospital Pro",
  laboratory: "Hospital Pro",
  hmo_insurance: "Hospital Pro",
  multi_branch: "Enterprise Network",
  human_resources: "Enterprise Network",
  accounting: "Enterprise Network",
};

export const MODULE_ROUTE_MAP: Record<string, string[]> = {
  emr: ["/consultations", "/consultations/workspace", "/consultations/vitals", "/emr"],
  reception: ["/appointments", "/patients"],
  billing: ["/billing"],
  pharmacy: ["/pharmacy", "/pharmacy/prescriptions", "/pharmacy/inventory", "/pharmacy/analytics"],
  laboratory: ["/laboratory"],
  hmo_insurance: ["/patients/hmo"],
  multi_branch: [],
  human_resources: ["/staff"],
  accounting: ["/accounting", "/accounting/registries", "/accounting/ledger", "/accounting/banks", "/accounting/reports"],
};

const UNGATED_ROUTES = [
  "/dashboard",
  "/settings",
  "/profile",
  "/reports",
  "/reports/clinical",
  "/reports/staff",
  "/inventory",
  "/radiology",
  "/inpatient",
];

export function findModuleForPath(pathname: string): string | null {
  const normalized = pathname.replace(/^\/[^/]+/, "");
  for (const [mod, routes] of Object.entries(MODULE_ROUTE_MAP)) {
    for (const route of routes) {
      if (route && (normalized === route || normalized.startsWith(route + "/"))) {
        return mod;
      }
    }
  }
  for (const route of UNGATED_ROUTES) {
    if (normalized === route || normalized.startsWith(route + "/")) {
      return null;
    }
  }
  return null;
}

export function getEffectiveAllowedModules(tenant: Tenant | null): string[] {
  if (!tenant) return [];
  if (tenant.allowedModulesOverride && tenant.allowedModulesOverride.length > 0) {
    return tenant.allowedModulesOverride;
  }
  return TIER_MODULE_DEFAULTS[tenant.tier] ?? [];
}
