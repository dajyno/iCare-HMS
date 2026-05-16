export type OrderStatus = "New Orders" | "Partially Completed" | "All Completed";
export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface PharmacyPrescriptionItem {
  id?: string;
  medicationId: string;
  sku: string;
  itemName: string;
  strength: string;
  packageType: string;
  unitOfMeasurement: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  qtyPrescribed: number;
  qtyDispensed: number;
  unitPrice: number;
}

export interface PharmacyPrescription {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientDob: string;
  prescriptionDate: string;
  prescribedBy: string;
  orderStatus: OrderStatus;
  items: PharmacyPrescriptionItem[];
}

export interface PharmacyInventoryItem {
  id: string;
  sku: string;
  itemName: string;
  packageType: string;
  unitOfMeasurement: string;
  unitsRemaining: number;
  reorderLevel: number;
  unitPrice: number;
  status: StockStatus;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PharmacyInvoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientCode: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  totalCost: number;
  status: string;
  createdAt: string;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  prescriptions: number;
}

export interface DrugDemand {
  name: string;
  count: number;
  revenue: number;
}

export interface AnalyticsData {
  revenueByMonth: MonthlyTrend[];
  topDrugs: DrugDemand[];
  totalRevenue: number;
  totalPrescriptions: number;
  avgOrderValue: number;
}
