export interface GlobalFilters {
  dateFrom: string | null;
  dateTo: string | null;
  department: string;
}

export interface MetricTrend {
  direction: "up" | "down" | "neutral";
  value: string;
}

export interface ClinicalMetrics {
  bedOccupancyRate: number;
  bedOccupancyTrend: MetricTrend;
  newRegistrationsToday: number;
  newRegistrationsTrend: MetricTrend;
  averageLengthOfStay: number;
  alosTrend: MetricTrend;
}

export interface StaffMetrics {
  activePersonnel: number;
  activePersonnelTrend: MetricTrend;
  consultationsToday: number;
  consultationsTrend: MetricTrend;
  taskCompletionRate: number;
  taskCompletionTrend: MetricTrend;
}

export type MetricKey =
  | "bed-occupancy"
  | "new-registrations"
  | "alos"
  | "active-personnel"
  | "consultations"
  | "task-completion";

export interface DrillDownColumn {
  key: string;
  label: string;
  format?: "text" | "number" | "percentage" | "currency" | "date" | "status";
  tooltip?: string;
}

export interface DrillDownRecord {
  id: string;
  [key: string]: unknown;
}

export interface MetricConfig {
  key: MetricKey;
  label: string;
  category: "clinical" | "staff";
  icon: string;
  color: string;
  columns: DrillDownColumn[];
}
