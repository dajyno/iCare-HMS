export interface BankAccount {
  bank_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  balance: number;
}

export interface IncomeRecord {
  id: string;
  amount: number;
  category: string;
  bank_id: string;
  bank_name?: string;
  status: "Pending" | "Verified";
  date: string;
  description: string;
  patient_id?: string;
  payment_method: string;
  created_at: string;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  bank_id: string;
  bank_name?: string;
  status: "Pending" | "Verified";
  date: string;
  description: string;
  payee: string;
  payment_method: string;
  created_at: string;
}

export type LedgerEntry = {
  id: string;
  date: string;
  type: "Income" | "Expense";
  category: string;
  description: string;
  payee?: string;
  amount: number;
  bank_id: string;
  bank_name: string;
  status: "Pending" | "Verified";
  source_id: string;
};

export const INCOME_CATEGORIES = [
  "Service",
  "Consultation",
  "Pharmacy",
  "Lab",
  "Radiology",
  "Inpatient",
  "Insurance",
] as const;

export const EXPENSE_CATEGORIES = [
  "Utility",
  "Salary",
  "Maintenance",
  "Supply",
  "Equipment",
  "Administrative",
] as const;

export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Reconciled: "bg-blue-50 text-blue-700 border-blue-200",
  Unreconciled: "bg-slate-50 text-slate-500 border-slate-200",
  Matched: "bg-teal-50 text-teal-700 border-teal-200",
};

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  { bank_id: "B-01", bank_name: "GTBank", account_name: "Operations", account_number: "0123456789", balance: 1500000 },
  { bank_id: "B-02", bank_name: "First Bank", account_name: "Payroll", account_number: "2012345678", balance: 850000 },
  { bank_id: "B-03", bank_name: "Access Bank", account_name: "Reserve", account_number: "3012345678", balance: 2100000 },
];

export const MOCK_INCOME: IncomeRecord[] = [
  { id: "INC-001", amount: 25000, category: "Service", bank_id: "B-01", bank_name: "GTBank", status: "Verified", date: "2026-05-20", description: "Consultation fee", patient_id: "PT-001", payment_method: "Cash", created_at: "2026-05-20T09:00:00Z" },
  { id: "INC-002", amount: 45000, category: "Pharmacy", bank_id: "B-01", bank_name: "GTBank", status: "Verified", date: "2026-05-20", description: "Medication sales", patient_id: "PT-002", payment_method: "Card", created_at: "2026-05-20T10:30:00Z" },
  { id: "INC-003", amount: 12000, category: "Lab", bank_id: "B-02", bank_name: "First Bank", status: "Pending", date: "2026-05-19", description: "Blood test payment", patient_id: "PT-003", payment_method: "Transfer", created_at: "2026-05-19T14:00:00Z" },
  { id: "INC-004", amount: 80000, category: "Inpatient", bank_id: "B-01", bank_name: "GTBank", status: "Verified", date: "2026-05-19", description: "Admission deposit", patient_id: "PT-004", payment_method: "Cash", created_at: "2026-05-19T11:00:00Z" },
  { id: "INC-005", amount: 3000, category: "Service", bank_id: "B-03", bank_name: "Access Bank", status: "Pending", date: "2026-05-18", description: "Folder fee", patient_id: "PT-005", payment_method: "Card", created_at: "2026-05-18T08:45:00Z" },
];

export const MOCK_EXPENSES: ExpenseRecord[] = [
  { id: "EXP-001", amount: 10000, category: "Utility", bank_id: "B-01", bank_name: "GTBank", status: "Pending", date: "2026-05-20", description: "Electricity bill", payee: "PHCN", payment_method: "Transfer", created_at: "2026-05-20T08:00:00Z" },
  { id: "EXP-002", amount: 50000, category: "Salary", bank_id: "B-02", bank_name: "First Bank", status: "Verified", date: "2026-05-19", description: "Staff salary advance", payee: "Nurse Ade", payment_method: "Transfer", created_at: "2026-05-19T16:00:00Z" },
  { id: "EXP-003", amount: 15000, category: "Supply", bank_id: "B-01", bank_name: "GTBank", status: "Verified", date: "2026-05-18", description: "Medical supplies", payee: "MedSupply Ltd", payment_method: "Transfer", created_at: "2026-05-18T12:00:00Z" },
  { id: "EXP-004", amount: 7500, category: "Maintenance", bank_id: "B-03", bank_name: "Access Bank", status: "Pending", date: "2026-05-17", description: "Generator maintenance", payee: "John Electric", payment_method: "Cash", created_at: "2026-05-17T10:00:00Z" },
];

export function computeLedger(): LedgerEntry[] {
  const incomeLedger: LedgerEntry[] = MOCK_INCOME.map((inc) => ({
    id: `ledger-income-${inc.id}`,
    date: inc.date,
    type: "Income" as const,
    category: inc.category,
    description: inc.description,
    amount: inc.amount,
    bank_id: inc.bank_id,
    bank_name: inc.bank_name || "",
    status: inc.status,
    source_id: inc.id,
  }));
  const expenseLedger: LedgerEntry[] = MOCK_EXPENSES.map((exp) => ({
    id: `ledger-expense-${exp.id}`,
    date: exp.date,
    type: "Expense" as const,
    category: exp.category,
    description: exp.description,
    payee: exp.payee,
    amount: exp.amount,
    bank_id: exp.bank_id,
    bank_name: exp.bank_name || "",
    status: exp.status,
    source_id: exp.id,
  }));
  return [...incomeLedger, ...expenseLedger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export const ACCOUNTING_LOCAL_KEY = "icare_accounting_data";
