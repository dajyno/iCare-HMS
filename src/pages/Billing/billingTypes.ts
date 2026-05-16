export type InvoiceSourceType = "Pharmacy" | "Lab" | "Consultation" | "General" | "Admin" | "Inpatient";

export type LineItemType = "Service" | "Product" | "Other";

export interface LineItem {
  code: string;
  name: string;
  type: LineItemType;
  date: string;
  price: number;
  qty: number;
  amount: number;
}

export interface NewInvoiceFormState {
  currentStep: 1 | 2;
  selectedPatient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
  } | null;
  sourceType: InvoiceSourceType | "";
  metaData: {
    doctorId: string;
    doctorName: string;
    admissionDays: number;
    dailyBedRate: number;
    folderFee: number;
    consultationFee: number;
  };
  lineItems: LineItem[];
  taxRate: number;
}

export const DEFAULT_LINE_ITEM: LineItem = {
  code: "G-01",
  name: "",
  type: "Service",
  date: new Date().toISOString().split("T")[0],
  price: 0,
  qty: 1,
  amount: 0,
};

export const INITIAL_FORM_STATE: NewInvoiceFormState = {
  currentStep: 1,
  selectedPatient: null,
  sourceType: "",
  metaData: {
    doctorId: "",
    doctorName: "",
    admissionDays: 1,
    dailyBedRate: 0,
    folderFee: 0,
    consultationFee: 0,
  },
  lineItems: [{ ...DEFAULT_LINE_ITEM }],
  taxRate: 0.05,
};

export const SOURCE_TABS = [
  "All",
  "Pharmacy",
  "Lab",
  "Consultation",
  "General",
  "Admin",
  "Inpatient",
] as const;

export const STATUS_STYLES: Record<string, string> = {
  Unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  PartiallyPaid: "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Refunded: "bg-slate-50 text-slate-500 border-slate-200",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-200",
};

export const SOURCE_STYLES: Record<string, string> = {
  Pharmacy: "bg-sky-50 text-sky-700 border-sky-200",
  Lab: "bg-purple-50 text-purple-700 border-purple-200",
  Consultation: "bg-teal-50 text-teal-700 border-teal-200",
  General: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Admin: "bg-amber-50 text-amber-700 border-amber-200",
  Inpatient: "bg-rose-50 text-rose-700 border-rose-200",
};

export function computeLineItemAmount(price: number, qty: number): number {
  return price * qty;
}

export function computeSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + computeLineItemAmount(item.price, item.qty), 0);
}

export function computeGrandTotal(subtotal: number, taxRate: number): number {
  return subtotal + subtotal * taxRate;
}

export function generateItemCode(idx: number): string {
  return `G-${String(idx + 1).padStart(2, "0")}`;
}
