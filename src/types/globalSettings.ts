export type RoleKey =
  | "SuperAdmin"
  | "HospitalAdmin"
  | "ChiefMedicalOfficer"
  | "Doctor"
  | "Nurse"
  | "LabTechnician"
  | "Pharmacist"
  | "Radiologist"
  | "Accountant"
  | "FrontDesk"
  | "Administrator";

export interface RolePermissions {
  allowedRoutes: string[];
  write: boolean;
  approve: boolean;
}

export interface GlobalSettings {
  hospitalName: string;
  hospitalAddress: string;
  hospitalCode: string;
  systemEmail: string;
  databaseLastBackup: string | null;

  baseCurrency: string;
  vatPercentage: number;
  invoicePaymentTerms: string;
  invoiceConditions: string;

  rbacMatrix: Record<RoleKey, RolePermissions>;
  staffRouteOverrides: Record<string, string[]>; // staff_id → additional allowed routes

  pendingTransactionAlerts: boolean;
  lowStockAlerts: boolean;
  automatedPatientReminders: boolean;

  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
}
