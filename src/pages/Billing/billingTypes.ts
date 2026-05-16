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

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  sourceType: string;
  paymentMethod: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
  } | null;
  items: {
    id: string;
    invoiceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export const MOCK_INVOICES: InvoiceSummary[] = [
  {
    id: "mock-001",
    invoiceNumber: "INV-2026-9042",
    patientId: "mock-pt-1",
    totalAmount: 15.0,
    amountPaid: 0,
    balance: 15.0,
    status: "Unpaid",
    sourceType: "Pharmacy",
    paymentMethod: null,
    createdBy: null,
    createdAt: "2026-05-16T15:10:00Z",
    updatedAt: "2026-05-16T15:10:00Z",
    patient: {
      id: "mock-pt-1",
      patientId: "MD/0016/23",
      firstName: "Jerel Kevin",
      lastName: "Parocha",
    },
    items: [
      {
        id: "mock-item-1",
        invoiceId: "mock-001",
        description: "Paracetamol-10 mg Tab",
        quantity: 1,
        unitPrice: 15.0,
        total: 15.0,
      },
    ],
  },
  {
    id: "mock-002",
    invoiceNumber: "INV-2026-9041",
    patientId: "mock-pt-2",
    totalAmount: 214.0,
    amountPaid: 0,
    balance: 214.0,
    status: "Unpaid",
    sourceType: "General",
    paymentMethod: null,
    createdBy: null,
    createdAt: "2026-05-16T14:37:00Z",
    updatedAt: "2026-05-16T14:37:00Z",
    patient: {
      id: "mock-pt-2",
      patientId: "EG/0042/99",
      firstName: "Charity",
      lastName: "Enyioko",
    },
    items: [
      {
        id: "mock-item-2a",
        invoiceId: "mock-002",
        description: "Physical Therapy Session",
        quantity: 1,
        unitPrice: 99.0,
        total: 99.0,
      },
      {
        id: "mock-item-2b",
        invoiceId: "mock-002",
        description: "General Blood Test",
        quantity: 1,
        unitPrice: 80.0,
        total: 80.0,
      },
      {
        id: "mock-item-2c",
        invoiceId: "mock-002",
        description: "VAT",
        quantity: 1,
        unitPrice: 35.0,
        total: 35.0,
      },
    ],
  },
  {
    id: "mock-003",
    invoiceNumber: "INV-2026-9040",
    patientId: "mock-pt-3",
    totalAmount: 250.0,
    amountPaid: 250.0,
    balance: 0,
    status: "Paid",
    sourceType: "Consultation",
    paymentMethod: "Cash",
    createdBy: null,
    createdAt: "2026-05-15T09:30:00Z",
    updatedAt: "2026-05-15T16:45:00Z",
    patient: {
      id: "mock-pt-3",
      patientId: "FL/0051/88",
      firstName: "Amara",
      lastName: "Okafor",
    },
    items: [
      {
        id: "mock-item-3",
        invoiceId: "mock-003",
        description: "Consultation — Dr. Adebayo",
        quantity: 1,
        unitPrice: 250.0,
        total: 250.0,
      },
    ],
  },
  {
    id: "mock-004",
    invoiceNumber: "INV-2026-9039",
    patientId: "mock-pt-4",
    totalAmount: 500.0,
    amountPaid: 0,
    balance: 500.0,
    status: "Unpaid",
    sourceType: "Inpatient",
    paymentMethod: null,
    createdBy: null,
    createdAt: "2026-05-14T11:00:00Z",
    updatedAt: "2026-05-14T11:00:00Z",
    patient: {
      id: "mock-pt-4",
      patientId: "AB/0033/77",
      firstName: "Chuka",
      lastName: "Okafor",
    },
    items: [
      {
        id: "mock-item-4",
        invoiceId: "mock-004",
        description: "Inpatient Admission (3 days)",
        quantity: 1,
        unitPrice: 500.0,
        total: 500.0,
      },
    ],
  },
  {
    id: "mock-005",
    invoiceNumber: "INV-2026-9038",
    patientId: "mock-pt-5",
    totalAmount: 75.0,
    amountPaid: 75.0,
    balance: 0,
    status: "Paid",
    sourceType: "Lab",
    paymentMethod: "Card",
    createdBy: null,
    createdAt: "2026-05-14T08:20:00Z",
    updatedAt: "2026-05-14T10:30:00Z",
    patient: {
      id: "mock-pt-5",
      patientId: "CD/0022/11",
      firstName: "Ibrahim",
      lastName: "Musa",
    },
    items: [
      {
        id: "mock-item-5",
        invoiceId: "mock-005",
        description: "Complete Blood Count",
        quantity: 1,
        unitPrice: 45.0,
        total: 45.0,
      },
      {
        id: "mock-item-5b",
        invoiceId: "mock-005",
        description: "Malaria Test",
        quantity: 1,
        unitPrice: 30.0,
        total: 30.0,
      },
    ],
  },
];
