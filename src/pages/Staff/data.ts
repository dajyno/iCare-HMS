export const DEPARTMENT_POSITIONS: Record<string, string[]> = {
  "Clinical / Medical": [
    "Medical Doctors",
    "Nursing",
    "Anesthesiology",
    "Resident / Intern",
  ],
  "Clinical Support Services": [
    "Laboratory",
    "Pharmacy",
    "Nursing Services",
    "Nutrition & Dietetics",
    "Physiotherapy / Physical Therapy",
    "Medical Records",
    "Infection Control",
    "Blood Bank / Transfusion Medicine",
  ],
  "Diagnostic & Imaging": [
    "Radiology",
    "Pathology",
    "Diagnostic Cardiology",
    "Diagnostic Neurology",
  ],
  "Administrative": [
    "Hospital Administration",
    "Human Resources",
    "Finance / Accounts",
    "Billing & Insurance",
    "Procurement / Supply Chain",
    "Public Relations / Communications",
    "Legal / Compliance",
    "Quality Assurance",
    "IT / Health Informatics",
    "Medical Education / Training",
    "Research & Development",
  ],
  "Operations & Facilities": [
    "Housekeeping / Environmental Services",
    "Security Services",
    "Patient Transport / Portering",
    "Patient Relations",
    "Social Work",
    "Facilities Management / Engineering",
  ],
};

export const DEPARTMENT_CATEGORIES = Object.keys(DEPARTMENT_POSITIONS);

export const ALL_POSITIONS = Object.values(DEPARTMENT_POSITIONS).flat();

const POPULAR_FIRST = ["Medical Doctors", "Nursing", "Laboratory", "Pharmacy", "Hospital Administration", "Human Resources", "Finance / Accounts"];
const REST = ALL_POSITIONS.filter((p) => !POPULAR_FIRST.includes(p));
export const FILTER_ORDERED_POSITIONS = [...POPULAR_FIRST, ...REST];

export const CLINICIAN_POSITIONS: readonly string[] = [
  "Medical Doctors",
  "Nursing",
  "Anesthesiology",
  "Resident / Intern",
];

export function getPositionsForDepartment(category: string): string[] {
  return DEPARTMENT_POSITIONS[category] || [];
}

const POSITION_TO_ROLE: Record<string, string> = {
  "Medical Doctors": "Doctor",
  "Nursing": "Nurse",
  "Nursing Services": "Nurse",
  "Pharmacy": "Pharmacist",
  "Laboratory": "LabTechnician",
  "Resident / Intern": "Doctor",
  "Anesthesiology": "Doctor",
  "Radiology": "Doctor",
  "Pathology": "Doctor",
  "Diagnostic Cardiology": "Doctor",
  "Diagnostic Neurology": "Doctor",
};

export function mapPositionToRole(position: string): string {
  return POSITION_TO_ROLE[position] || "HospitalAdmin";
}

export const ROLE_TO_POSITION: Record<string, string> = {
  "Doctor": "Medical Doctors",
  "Nurse": "Nursing",
  "Pharmacist": "Pharmacy",
  "LabTechnician": "Laboratory",
  "HospitalAdmin": "Hospital Administration",
  "SuperAdmin": "Hospital Administration",
  "Receptionist": "Patient Relations",
  "BillingOfficer": "Billing & Insurance",
  "InventoryOfficer": "Procurement / Supply Chain",
};

export const ROLE_TO_DEPARTMENT: Record<string, string> = {
  "Doctor": "Clinical / Medical",
  "Nurse": "Clinical / Medical",
  "Pharmacist": "Clinical Support Services",
  "LabTechnician": "Clinical Support Services",
  "HospitalAdmin": "Administrative",
  "SuperAdmin": "Administrative",
  "Receptionist": "Operations & Facilities",
  "BillingOfficer": "Administrative",
  "InventoryOfficer": "Administrative",
};
