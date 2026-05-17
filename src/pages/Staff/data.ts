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

export const INITIAL_STAFF_RECORDS: StaffRecord[] = [
  {
    staff_id: "STF-2026-0012",
    name: "Dr. Eric Lieberman",
    position: "Medical Doctors",
    department: "Critical Care Medicine",
    availability_status: "Active",
    is_clinician: true,
    gender: "Male",
    address: "1428 Maple Avenue, Suite 300, Springfield, IL 62701",
    email: "eric.lieberman@icare.com",
    phone: "+1 (217) 555-0142",
    canLogin: true,
    password: "",
    profilePicture: "",
    permissions: {
      billing: { enabled: true, views: ["ledger"] },
      inpatient: {
        enabled: true,
        views: ["ward_board", "mar_execution", "fluid_matrix", "discharge_auth"],
      },
      staff_management: { enabled: false, views: [] },
    },
  },
  {
    staff_id: "STF-2026-0045",
    name: "Nurse Sarah Jenkins",
    position: "Nursing",
    department: "Emergency Ward",
    availability_status: "Active",
    is_clinician: false,
    gender: "Female",
    address: "875 Oak Street, Apt 4B, Springfield, IL 62704",
    email: "sarah.jenkins@icare.com",
    phone: "+1 (217) 555-0189",
    canLogin: true,
    password: "",
    profilePicture: "",
    permissions: {
      billing: { enabled: false, views: [] },
      inpatient: {
        enabled: true,
        views: ["ward_board", "mar_execution", "fluid_matrix"],
      },
      staff_management: { enabled: false, views: [] },
    },
  },
  {
    staff_id: "STF-2026-0089",
    name: "Amara Okechukwu",
    position: "Pharmacy",
    department: "Main Outpatient Pharmacy",
    availability_status: "On Leave",
    is_clinician: false,
    gender: "Female",
    address: "312 Pine Road, Springfield, IL 62702",
    email: "amara.okechukwu@icare.com",
    phone: "+1 (217) 555-0234",
    canLogin: false,
    password: "",
    profilePicture: "",
    permissions: {
      billing: { enabled: true, views: ["ledger", "create_invoice"] },
      inpatient: { enabled: false, views: [] },
      staff_management: { enabled: false, views: [] },
    },
  },
  {
    staff_id: "STF-2026-0102",
    name: "David Vance",
    position: "Administration",
    department: "Finance & Accounts",
    availability_status: "Active",
    is_clinician: false,
    gender: "Male",
    address: "560 Elm Street, Springfield, IL 62703",
    email: "david.vance@icare.com",
    phone: "+1 (217) 555-0311",
    canLogin: true,
    password: "",
    profilePicture: "",
    permissions: {
      billing: {
        enabled: true,
        views: ["ledger", "create_invoice", "process_payment"],
      },
      inpatient: { enabled: false, views: [] },
      staff_management: {
        enabled: true,
        views: ["view_roster", "edit_permissions"],
      },
    },
  },
  {
    staff_id: "STF-2026-0311",
    name: "Kofi Mensah",
    position: "Others",
    department: "IT Support Infrastructure",
    availability_status: "Off-Duty",
    is_clinician: false,
    gender: "Male",
    address: "999 Cedar Lane, Springfield, IL 62705",
    email: "kofi.mensah@icare.com",
    phone: "+1 (217) 555-0456",
    canLogin: false,
    password: "",
    profilePicture: "",
    permissions: {
      billing: { enabled: true, views: ["ledger"] },
      inpatient: { enabled: true, views: ["ward_board"] },
      staff_management: { enabled: true, views: ["view_roster"] },
    },
  },
];
