export interface Tenant {
  tenantId: string;
  hospitalName: string;
  urlSlug: string;
  status: "Active" | "Trial" | "Suspended";
  tier: "Standard" | "Premium" | "Enterprise";
  maxDoctorSeats: number;
  maxBedCapacity: number;
  expiryDate: string | null;
  createdAt: string;
}

export interface SubscriptionTier {
  id: string;
  name: "Standard" | "Premium" | "Enterprise";
  maxDoctorSeats: number;
  maxBedCapacity: number;
  monthlyPrice: number;
  description: string | null;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  role: "SuperAdmin" | "Support";
}
