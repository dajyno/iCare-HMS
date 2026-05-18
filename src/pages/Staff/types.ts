export type AvailabilityStatus = "Active" | "Off-Duty" | "On Leave";

export type StaffPosition =
  | "Medical Doctors"
  | "Nursing"
  | "Pharmacy"
  | "Laboratory"
  | "Administration"
  | "Others";

export interface StaffPermissions {
  enabled: boolean;
  views: string[];
}

export interface StaffRecord {
  staff_id: string;
  name: string;
  position: StaffPosition;
  department: string;
  availability_status: AvailabilityStatus;
  is_clinician: boolean;
  permissions: Record<string, StaffPermissions>;
  gender: string;
  address: string;
  email: string;
  phone: string;
  canLogin: boolean;
  password: string;
  profilePicture: string;
  authUserId?: string;
}

export interface PermissionChild {
  key: string;
  label: string;
}

export interface PermissionModule {
  label: string;
  children: PermissionChild[];
}

export type PermissionTree = Record<string, PermissionModule>;
