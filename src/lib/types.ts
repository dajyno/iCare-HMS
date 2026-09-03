export interface User {
  id: string;
  tenantId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: "SuperAdmin" | "HospitalAdmin" | "ChiefMedicalOfficer" | "Doctor" | "Nurse" | "LabTechnician" | "Pharmacist" | "Radiologist" | "Accountant" | "FrontDesk" | "Administrator";
  departmentId?: string | null;
  status: "active" | "inactive" | "suspended";
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export interface Patient {
  id: string;
  patient_id: string;
  patientId?: string;
  first_name: string;
  firstName?: string;
  last_name: string;
  lastName?: string;
  gender: string;
  date_of_birth: string;
  dateOfBirth?: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  category: "Individual" | "Family" | "Corporate" | "HMO";
  status: "active" | "inactive";
  emergency_contact?: string | null;
  emergencyContact?: string | null;
  blood_group?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  medicalHistory?: string | null;
  insurance_provider?: string | null;
  insuranceProvider?: string | null;
  insurance_id?: string | null;
  insuranceId?: string | null;
  next_of_kin_name?: string | null;
  nextOfKinName?: string | null;
  next_of_kin_phone?: string | null;
  nextOfKinPhone?: string | null;
  next_of_kin_relation?: string | null;
  nextOfKinRelation?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  company_phone?: string | null;
  companyPhone?: string | null;
  company_address?: string | null;
  companyAddress?: string | null;
  department_id?: string | null;
  departmentId?: string | null;
  profilePicture?: string;
  profile_picture?: string | null;
  registration_date: string;
  registrationDate?: string;
  family_id?: string | null;
  familyId?: string | null;
  is_primary?: boolean;
  isPrimary?: boolean;
}

export type AppointmentStatus = "Unconfirmed" | "Confirmed" | "Waiting" | "Ongoing" | "Completed" | "Conflict" | "Unavailable" | "Cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patient_id?: string;
  doctorId: string;
  doctor_id?: string;
  startTime: string;
  start_time?: string;
  endTime: string;
  end_time?: string;
  reason?: string | null;
  status: AppointmentStatus;
  invoiceAmount?: number | null;
  invoice_amount?: number | null;
  invoiceId?: string | null;
  invoice_id?: string | null;
  notes?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  patient?: Patient;
  doctor?: User;
}

export interface Consultation {
  id: string;
  patient_id: string;
  patientId?: string;
  doctor_id: string;
  doctorId?: string;
  appointment_id?: string | null;
  appointmentId?: string | null;
  chief_complaint: string;
  chiefComplaint?: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  clinical_notes?: string | null;
  clinicalNotes?: string | null;
  treatment_plan?: string | null;
  treatmentPlan?: string | null;
  follow_up_date?: string | null;
  followUpDate?: string | null;
  status: "VitalsRecorded" | "InProgress" | "Completed";
  created_at: string;
  createdAt?: string;
  patient?: Patient;
  doctor?: User;
  vital_signs?: VitalSigns[];
  vitalSigns?: VitalSigns[];
}

export interface VitalSigns {
  id: string;
  consultation_id: string;
  consultationId?: string;
  temperature?: number | null;
  blood_pressure?: string | null;
  bloodPressure?: string | null;
  pulse_rate?: number | null;
  pulseRate?: number | null;
  respiratory_rate?: number | null;
  respiratoryRate?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  oxygen_saturation?: number | null;
  oxygenSaturation?: number | null;
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
  patientId?: string;
  test_id: string;
  testId?: string;
  batch_id?: string | null;
  consultation_id?: string | null;
  consultationId?: string | null;
  status: "Requested" | "SampleCollected" | "InProgress" | "AwaitingValidation" | "Completed" | "Cancelled";
  requested_by_name?: string | null;
  requestedByName?: string | null;
  completed_by_name?: string | null;
  completedByName?: string | null;
  created_at: string;
  createdAt?: string;
  invoice_id?: string | null;
  invoiceId?: string | null;
  referred_by?: string | null;
  referredBy?: string | null;
  payment_status?: string | null;
  paymentStatus?: string | null;
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
  edited_by?: string | null;
  edited_at?: string | null;
  attachment_url?: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  user_id?: string;
  title: string;
  message: string;
  type: "Info" | "Warning" | "Alert";
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
  link?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoiceNumber?: string;
  patient_id: string;
  patientId?: string;
  total_amount: number;
  totalAmount?: number;
  amount_paid: number;
  amountPaid?: number;
  balance: number;
  status: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded" | "Cancelled";
  payment_method?: string | null;
  paymentMethod?: string | null;
  prescription_id?: string | null;
  prescriptionId?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
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
  patientId?: string;
  exam_id: string;
  examId?: string;
  batch_id?: string | null;
  folder_no?: string | null;
  status: "Requested" | "InProgress" | "Completed" | "Cancelled";
  requested_by_id?: string | null;
  requestedById?: string | null;
  radiologist_id?: string | null;
  radiologistId?: string | null;
  notes?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  invoice_id?: string | null;
  invoiceId?: string | null;
  referred_by?: string | null;
  referredBy?: string | null;
  payment_status?: string | null;
  paymentStatus?: string | null;
  patient?: Patient;
  exam?: RadiologyExam;
  result?: RadiologyResult;
}

export interface RadiologyResult {
  id: string;
  request_id: string;
  requestId?: string;
  patient_id: string;
  patientId?: string;
  findings: string;
  conclusion: string;
  technician_id?: string | null;
  technicianId?: string | null;
  radiologist_id?: string | null;
  radiologistId?: string | null;
  report_date: string;
  reportDate?: string;
  created_at: string;
  createdAt?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  invoiceId?: string;
  description: string;
  category?: string;
  quantity: number;
  unit_price: number;
  unitPrice?: number;
  total: number;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

type SupabaseTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: SupabaseTable<User>;
      departments: SupabaseTable<Department>;
      patients: SupabaseTable<Patient>;
      appointments: SupabaseTable<Appointment>;
      consultations: SupabaseTable<Consultation>;
      vital_signs: SupabaseTable<VitalSigns>;
      medications: SupabaseTable<Medication>;
      prescriptions: SupabaseTable<Prescription>;
      prescription_items: SupabaseTable<PrescriptionItem>;
      lab_tests: SupabaseTable<LabTest>;
      lab_requests: SupabaseTable<LabRequest>;
      lab_results: SupabaseTable<LabResult>;
      invoices: SupabaseTable<Invoice>;
      invoice_items: SupabaseTable<InvoiceItem>;
      wards: SupabaseTable<Ward>;
      beds: SupabaseTable<Bed>;
      admissions: SupabaseTable<Admission>;
      inventory_items: SupabaseTable<InventoryItem>;
      suppliers: SupabaseTable<Supplier>;
      radiology_categories: SupabaseTable<RadiologyCategory>;
      radiology_exams: SupabaseTable<RadiologyExam>;
      radiology_requests: SupabaseTable<RadiologyRequest>;
      radiology_results: SupabaseTable<RadiologyResult>;
      notifications: SupabaseTable<AppNotification>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
