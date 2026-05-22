export type AvailabilityStatus = "Active" | "Off-Duty" | "On Leave";

export type StaffPosition =
  | "Medical Doctors"
  | "Nursing"
  | "Pharmacy"
  | "Laboratory"
  | "Administration"
  | "Others";

export interface StaffRecord {
  staff_id: string;
  name: string;
  position: StaffPosition;
  department: string;
  availability_status: AvailabilityStatus;
  is_clinician: boolean;
  gender: string;
  address: string;
  email: string;
  phone: string;
  canLogin: boolean;
  password: string;
  profilePicture: string;
  authUserId?: string;
}
