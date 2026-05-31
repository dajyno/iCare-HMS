import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  type BankAccount,
  type IncomeRecord,
  type ExpenseRecord,
  type LedgerEntry,
  type CategoryItem,
  generateId,
  getIncomeCategories,
  getExpenseCategories,
} from "./types";

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ["accounting", "bank_accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bank_accounts")
        .select("*")
        .order("bank_name");
      if (error) return [];
      return (toCamel(data) as BankAccount[]) || [];
    },
  });
}

export function useIncome() {
  return useQuery<IncomeRecord[]>({
    queryKey: ["accounting", "income"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("accounting_income")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (toCamel(data) as IncomeRecord[]) || [];
    },
  });
}

export function useExpenses() {
  return useQuery<ExpenseRecord[]>({
    queryKey: ["accounting", "expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("accounting_expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (toCamel(data) as ExpenseRecord[]) || [];
    },
  });
}

export function usePendingVerifications() {
  const incomeQuery = useIncome();
  const expensesQuery = useExpenses();

  const pending = [
    ...(incomeQuery.data || []).filter((i) => i.status === "Pending").map((i) => ({ ...i, _type: "Income" as const })),
    ...(expensesQuery.data || []).filter((e) => e.status === "Pending").map((e) => ({ ...e, _type: "Expense" as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    data: pending,
    isLoading: incomeQuery.isLoading || expensesQuery.isLoading,
    error: incomeQuery.error || expensesQuery.error,
  };
}

export function useLedger(filter?: string | null, dateRange?: string | null) {
  const incomeQuery = useIncome();
  const expensesQuery = useExpenses();

  return useQuery<LedgerEntry[]>({
    queryKey: ["accounting", "ledger", filter, dateRange],
    queryFn: () => {
      const incomeLedger: LedgerEntry[] = (incomeQuery.data || []).map((inc) => ({
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
      const expenseLedger: LedgerEntry[] = (expensesQuery.data || []).map((exp) => ({
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
      let entries = [...incomeLedger, ...expenseLedger].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (filter && filter !== "All") {
        entries = entries.filter(
          (e) => e.category.toLowerCase() === filter.toLowerCase()
        );
      }
      if (dateRange) {
        entries = entries.filter((e) => e.date === dateRange);
      }
      return entries;
    },
    enabled: !!incomeQuery.data && !!expensesQuery.data,
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<IncomeRecord, "id" | "created_at" | "bank_name"> & { bank_name: string }) => {
      const newRecord: IncomeRecord = {
        ...record,
        id: generateId("INC"),
        created_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("accounting_income")
        .insert({
          id: newRecord.id,
          amount: newRecord.amount,
          category: newRecord.category,
          bank_id: newRecord.bank_id,
          status: newRecord.status,
          date: newRecord.date,
          description: newRecord.description,
          patient_id: newRecord.patient_id,
          patient_name: newRecord.patient_name,
          payment_method: newRecord.payment_method,
        });
      if (error) throw error;
      return newRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<ExpenseRecord, "id" | "created_at" | "bank_name"> & { bank_name: string }) => {
      const newRecord: ExpenseRecord = {
        ...record,
        id: generateId("EXP"),
        created_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("accounting_expenses")
        .insert({
          id: newRecord.id,
          amount: newRecord.amount,
          category: newRecord.category,
          bank_id: newRecord.bank_id,
          status: newRecord.status,
          date: newRecord.date,
          description: newRecord.description,
          payee: newRecord.payee,
          payment_method: newRecord.payment_method,
        });
      if (error) throw error;
      return newRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Omit<BankAccount, "bank_id">) => {
      const newAccount: BankAccount = {
        ...account,
        bank_id: generateId("B"),
      };
      const { error } = await (supabase as any)
        .from("bank_accounts")
        .insert({
          bank_id: newAccount.bank_id,
          bank_name: newAccount.bank_name,
          account_name: newAccount.account_name,
          account_number: newAccount.account_number,
          balance: newAccount.balance,
        });
      if (error) throw error;
      return newAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "bank_accounts"] });
    },
  });
}

export function useVerifyTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      type,
      bank_id,
      amount,
    }: {
      id: string;
      type: "Income" | "Expense";
      bank_id: string;
      amount: number;
    }) => {
      if (type === "Income") {
        await (supabase as any).from("accounting_income").update({ status: "Verified" }).eq("id", id);
      } else {
        await (supabase as any).from("accounting_expenses").update({ status: "Verified" }).eq("id", id);
      }
      // Update bank balance
      const { data: bank } = await (supabase as any)
        .from("bank_accounts")
        .select("balance")
        .eq("bank_id", bank_id)
        .single();
      if (bank) {
        const newBalance = type === "Income"
          ? (bank.balance || 0) + amount
          : (bank.balance || 0) - amount;
        await (supabase as any)
          .from("bank_accounts")
          .update({ balance: newBalance })
          .eq("bank_id", bank_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
  });
}

const MOCK_PATIENTS = [
  { id: "mock-pt-1", patientId: "MD/0016/23", firstName: "Jerel Kevin", lastName: "Parocha" },
  { id: "mock-pt-2", patientId: "EG/0042/99", firstName: "Charity", lastName: "Enyioko" },
  { id: "mock-pt-3", patientId: "FL/0051/88", firstName: "Amara", lastName: "Okafor" },
  { id: "mock-pt-4", patientId: "AB/0033/77", firstName: "Chuka", lastName: "Okafor" },
  { id: "mock-pt-5", patientId: "CD/0022/11", firstName: "Ibrahim", lastName: "Musa" },
];

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["accounting", "patients", query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];
      const lower = query.toLowerCase();
      const local = MOCK_PATIENTS.filter(
        (p) =>
          p.firstName.toLowerCase().includes(lower) ||
          p.lastName.toLowerCase().includes(lower) ||
          p.patientId.toLowerCase().includes(lower)
      );
      try {
        const { data, error } = await (supabase as any)
          .from("patients")
          .select("id, patient_id, first_name, last_name")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`)
          .limit(8);
        if (error) return local;
        const supabaseResults = toCamel(data) as { id: string; patientId: string; firstName: string; lastName: string }[];
        return supabaseResults.length > 0 ? supabaseResults : local;
      } catch {
        return local;
      }
    },
    enabled: query.trim().length >= 2,
  });
}

export async function createIncomeFromPayment(params: {
  amount: number;
  category: string;
  bankAccountId: string | null;
  paymentMethod: string;
  patientId: string | undefined;
  patientName: string | undefined;
  invoiceNumber: string;
}): Promise<IncomeRecord> {
  let bankId = params.bankAccountId;

  if (!bankId) {
    const { data: fallbackBank } = await (supabase as any)
      .from("bank_accounts")
      .select("bank_id")
      .limit(1)
      .maybeSingle();
    if (fallbackBank) {
      bankId = fallbackBank.bank_id;
    }
  }

  if (!bankId) {
    throw new Error(
      "Cannot record payment: no bank account configured. Please create a bank account in Accounting settings."
    );
  }

  const record: IncomeRecord = {
    id: generateId("INC"),
    amount: params.amount,
    category: params.category,
    bank_id: bankId,
    bank_name: "",
    status: "Verified",
    date: new Date().toISOString().split("T")[0],
    description: `Payment for ${params.invoiceNumber}`,
    patient_id: params.patientId,
    patient_name: params.patientName,
    payment_method: params.paymentMethod,
    created_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("accounting_income")
    .insert({
      id: record.id,
      amount: record.amount,
      category: record.category,
      bank_id: record.bank_id,
      status: record.status,
      date: record.date,
      description: record.description,
      patient_id: record.patient_id || null,
      patient_name: record.patient_name || null,
      payment_method: record.payment_method,
    });
  if (error) throw error;

  return record;
}

export function useIncomeCategories() {
  return useQuery<CategoryItem[]>({
    queryKey: ["accounting", "incomeCategories"],
    queryFn: () => getIncomeCategories(),
    staleTime: Infinity,
  });
}

export function useExpenseCategories() {
  return useQuery<CategoryItem[]>({
    queryKey: ["accounting", "expenseCategories"],
    queryFn: () => getExpenseCategories(),
    staleTime: Infinity,
  });
}
