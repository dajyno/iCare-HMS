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

export interface Tenant {
  tenantId: string;
  hospitalName: string;
  urlSlug: string;
  status: "Active" | "Trial" | "Suspended";
  tier: "Standard" | "Premium" | "Enterprise";
  maxStaffSeats: number;
  maxBedCapacity: number;
  allowedModulesOverride: string[] | null;
  expiryDate: string | null;
  createdAt: string;
}

export interface SubscriptionTier {
  id: string;
  name: "Standard" | "Premium" | "Enterprise";
  maxStaffSeats: number;
  maxBedCapacity: number;
  monthlyPrice: number;
  description: string | null;
  allowedModules: string[];
}

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  role: "SuperAdmin" | "Support";
}
