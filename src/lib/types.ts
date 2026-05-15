export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "SuperAdmin" | "HospitalAdmin" | "Receptionist" | "Doctor" | "Nurse" | "LabTechnician" | "Pharmacist" | "BillingOfficer" | "InventoryOfficer";
  department_id?: string | null;
  status: "active" | "inactive" | "suspended";
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  category: "Individual" | "Family" | "Corporate" | "HMO";
  status: "active" | "inactive";
  emergency_contact?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  insurance_provider?: string | null;
  insurance_id?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_phone?: string | null;
  next_of_kin_relation?: string | null;
  company_name?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  department_id?: string | null;
  registration_date: string;
  family_id?: string | null;
  is_primary?: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  reason?: string | null;
  status: "Scheduled" | "CheckedIn" | "Waiting" | "InConsultation" | "Completed" | "Cancelled" | "NoShow";
  notes?: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: User;
}

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string | null;
  chief_complaint: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  clinical_notes?: string | null;
  treatment_plan?: string | null;
  follow_up_date?: string | null;
  status: string;
  created_at: string;
  patient?: Patient;
  doctor?: User;
}

export interface VitalSigns {
  id: string;
  consultation_id: string;
  temperature?: number | null;
  blood_pressure?: string | null;
  pulse_rate?: number | null;
  respiratory_rate?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  oxygen_saturation?: number | null;
}

export interface Medication {
  id: string;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  quantity_in_stock: number;
  reorder_level: number;
  unit_price: number;
  supplier?: string | null;
  status: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  consultation_id?: string | null;
  date: string;
  status: "Pending" | "Dispensed" | "PartiallyDispensed" | "Cancelled";
  patient?: Patient;
  doctor?: User;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  medication?: Medication;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export interface LabTest {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  sample_type?: string | null;
  reference_range?: string | null;
  lead_time?: string | null;
  status: string;
}

export interface LabRequest {
  id: string;
  patient_id: string;
  test_id: string;
  consultation_id?: string | null;
  status: "Requested" | "SampleCollected" | "InProgress" | "AwaitingValidation" | "Completed" | "Cancelled";
  created_at: string;
  patient?: Patient;
  test?: LabTest;
}

export interface LabResult {
  id: string;
  request_id: string;
  patient_id: string;
  result_value: string;
  unit?: string | null;
  reference_range?: string | null;
  interpretation?: string | null;
  technician_id?: string | null;
  validated_by_id?: string | null;
  date: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded" | "Cancelled";
  payment_method?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface Ward {
  id: string;
  name: string;
  type: "General" | "Semi-Private" | "Private" | "ICU" | "Emergency";
  beds_count: number;
  department_id: string;
}

export interface Bed {
  id: string;
  bed_number: string;
  ward_id: string;
  status: "Available" | "Occupied" | "Reserved" | "Cleaning" | "Maintenance";
  ward?: Ward;
  admissions?: Admission[];
}

export interface Admission {
  id: string;
  patient_id: string;
  admission_date: string;
  ward_id: string;
  bed_id: string;
  admitting_doctor_id: string;
  diagnosis?: string | null;
  notes?: string | null;
  status: "Admitted" | "Discharged" | "Transferred";
  patient?: Patient;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string | null;
  sku?: string | null;
  quantity: number;
  unit?: string | null;
  reorder_level: number;
  supplier_id?: string | null;
  cost_price?: number | null;
  selling_price?: number | null;
  expiry_date?: string | null;
  location?: string | null;
  status: string;
  department_id?: string | null;
  supplier?: Supplier | null;
}

export interface RadiologyCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

export interface RadiologyExam {
  id: string;
  name: string;
  category_id: string;
  price: number;
  description?: string | null;
  preparation_notes?: string | null;
  status: string;
  category?: RadiologyCategory;
}

export interface RadiologyRequest {
  id: string;
  patient_id: string;
  exam_id: string;
  batch_id?: string | null;
  folder_no?: string | null;
  status: "Requested" | "InProgress" | "Completed" | "Cancelled";
  requested_by_id?: string | null;
  radiologist_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  exam?: RadiologyExam;
  result?: RadiologyResult;
}

export interface RadiologyResult {
  id: string;
  request_id: string;
  patient_id: string;
  findings: string;
  conclusion: string;
  technician_id?: string | null;
  radiologist_id?: string | null;
  report_date: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User };
      departments: { Row: Department };
      patients: { Row: Patient };
      appointments: { Row: Appointment };
      consultations: { Row: Consultation };
      vital_signs: { Row: VitalSigns };
      medications: { Row: Medication };
      prescriptions: { Row: Prescription };
      prescription_items: { Row: PrescriptionItem };
      lab_tests: { Row: LabTest };
      lab_requests: { Row: LabRequest };
      lab_results: { Row: LabResult };
      invoices: { Row: Invoice };
      wards: { Row: Ward };
      beds: { Row: Bed };
      admissions: { Row: Admission };
      inventory_items: { Row: InventoryItem };
      suppliers: { Row: Supplier };
      radiology_categories: { Row: RadiologyCategory };
      radiology_exams: { Row: RadiologyExam };
      radiology_requests: { Row: RadiologyRequest };
      radiology_results: { Row: RadiologyResult };
    };
  };
};
