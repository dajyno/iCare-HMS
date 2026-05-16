export interface Patient {
  folderNo: string;
  name: string;
  age: number;
  allergies: string[];
}

export interface VitalsRecord {
  timestamp: string;
  bp: string;
  pulse: number;
  temp: number;
  spo2: number;
}

export interface AdministrationLogEntry {
  slot: string;
  status: "Administered" | "Pending" | "Missed" | "Skipped";
  loggedAt: string | null;
  note: string;
}

export interface MedicationSchedule {
  drugId: string;
  name: string;
  frequency: "OD" | "BD" | "TDS" | "PRN" | "Custom";
  assignedSlots: string[];
  administrationLog: AdministrationLogEntry[];
}

export interface FluidEntry {
  itemId: string;
  timestamp: string;
  source: string;
  volume: number;
}

export interface FluidLedger {
  intake: FluidEntry[];
  output: FluidEntry[];
}

export interface ActiveAdmission {
  admissionId: string;
  wardCode: string;
  bedNo: string;
  patient: Patient;
  attendingPhysician: string;
  daysAdmitted: number;
  careStatus: "Meds Due" | "Critical Observation" | "Stable";
  vitalsHistory: VitalsRecord[];
  medicationSchedule: MedicationSchedule[];
  fluidLedger: FluidLedger;
}

export interface BedUnit {
  bedCode: string;
  status: "Available" | "Occupied" | "Maintenance/Sanitizing";
}

export interface WardConfig {
  wardId: string;
  name: string;
  department: string;
  totalBeds: number;
  beds: BedUnit[];
}

export interface InpatientMasterState {
  activeAdmissions: ActiveAdmission[];
  wardConfiguration: WardConfig[];
}

export type CareStatus = ActiveAdmission["careStatus"];
export type BedStatus = BedUnit["status"];
export type MedFrequency = MedicationSchedule["frequency"];
export type AdminStatus = AdministrationLogEntry["status"];
