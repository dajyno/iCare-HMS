import type { StaffRecord, PermissionTree } from "./types";

export const POSITIONS = [
  "All Staff",
  "Medical Doctors",
  "Nursing",
  "Pharmacy",
  "Laboratory",
  "Administration",
  "Others",
] as const;

export const PERMISSION_TREE: PermissionTree = {
  billing: {
    label: "Billing Module",
    children: [
      { key: "ledger", label: "View Ledger Queue" },
      { key: "create_invoice", label: "Create New Invoices" },
      { key: "process_payment", label: "Process Payment Settlement" },
    ],
  },
  inpatient: {
    label: "Inpatient Module",
    children: [
      { key: "ward_board", label: "Ward Board View" },
      { key: "mar_execution", label: "MAR Execution (Drug Logging)" },
      { key: "fluid_matrix", label: "Fluid Matrix Modifications" },
      { key: "discharge_auth", label: "Discharge Authorization" },
    ],
  },
  staff_management: {
    label: "Staff Management",
    children: [
      { key: "view_roster", label: "View Staff Roster" },
      { key: "edit_permissions", label: "Edit Permissions" },
    ],
  },
};

export const INITIAL_STAFF_RECORDS: StaffRecord[] = [];
