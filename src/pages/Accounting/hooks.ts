import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  type BankAccount,
  type IncomeRecord,
  type ExpenseRecord,
  type LedgerEntry,
  MOCK_BANK_ACCOUNTS,
  MOCK_INCOME,
  MOCK_EXPENSES,
  computeLedger,
  generateId,
  ACCOUNTING_LOCAL_KEY,
} from "./types";

type AccountingData = {
  bank_accounts: BankAccount[];
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
};

function loadLocal(): AccountingData {
  try {
    const raw = localStorage.getItem(ACCOUNTING_LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { bank_accounts: MOCK_BANK_ACCOUNTS, income: MOCK_INCOME, expenses: MOCK_EXPENSES };
}

function saveLocal(data: AccountingData) {
  localStorage.setItem(ACCOUNTING_LOCAL_KEY, JSON.stringify(data));
}

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ["accounting", "bank_accounts"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("bank_accounts")
          .select("*")
          .order("bank_name");
        if (error) throw error;
        if (data && data.length > 0) return toCamel(data) as BankAccount[];
      } catch { /* fallback */ }
      return loadLocal().bank_accounts;
    },
  });
}

export function useIncome() {
  return useQuery<IncomeRecord[]>({
    queryKey: ["accounting", "income"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("accounting_income")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return toCamel(data) as IncomeRecord[];
      } catch { /* fallback */ }
      return loadLocal().income;
    },
  });
}

export function useExpenses() {
  return useQuery<ExpenseRecord[]>({
    queryKey: ["accounting", "expenses"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("accounting_expenses")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return toCamel(data) as ExpenseRecord[];
      } catch { /* fallback */ }
      return loadLocal().expenses;
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
      if (filter) {
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
      try {
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
            payment_method: newRecord.payment_method,
          });
        if (!error) return newRecord;
      } catch { /* fallback */ }
      const local = loadLocal();
      local.income.unshift(newRecord);
      saveLocal(local);
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
      try {
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
        if (!error) return newRecord;
      } catch { /* fallback */ }
      const local = loadLocal();
      local.expenses.unshift(newRecord);
      saveLocal(local);
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
      try {
        const { error } = await (supabase as any)
          .from("bank_accounts")
          .insert({
            bank_id: newAccount.bank_id,
            bank_name: newAccount.bank_name,
            account_name: newAccount.account_name,
            account_number: newAccount.account_number,
            balance: newAccount.balance,
          });
        if (!error) return newAccount;
      } catch { /* fallback */ }
      const local = loadLocal();
      local.bank_accounts.push(newAccount);
      saveLocal(local);
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
      const local = loadLocal();
      if (type === "Income") {
        const idx = local.income.findIndex((i) => i.id === id);
        if (idx !== -1) local.income[idx].status = "Verified";
      } else {
        const idx = local.expenses.findIndex((e) => e.id === id);
        if (idx !== -1) local.expenses[idx].status = "Verified";
      }
      const bankIdx = local.bank_accounts.findIndex((b) => b.bank_id === bank_id);
      if (bankIdx !== -1) {
        if (type === "Income") local.bank_accounts[bankIdx].balance += amount;
        else local.bank_accounts[bankIdx].balance -= amount;
      }
      saveLocal(local);

      try {
        await Promise.all([
          (supabase as any)
            .from("accounting_income")
            .update({ status: "Verified" })
            .eq("id", id),
          (supabase as any)
            .from("accounting_expenses")
            .update({ status: "Verified" })
            .eq("id", id),
          (supabase as any)
            .from("bank_accounts")
            .update({ balance: local.bank_accounts[bankIdx]?.balance })
            .eq("bank_id", bank_id),
        ]);
      } catch { /* ignore */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
  });
}
