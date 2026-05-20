import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Search, RefreshCw, ArrowUpRight, ArrowDownRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useIncome, useExpenses } from "../hooks";
import { STATUS_STYLES, type LedgerEntry as LedgerEntryType } from "../types";

const LedgerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const rangeParam = searchParams.get("range");
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();

  const entries = useMemo(() => {
    const incomeEntries: LedgerEntryType[] = (income || []).map((inc) => ({
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
    const expenseEntries: LedgerEntryType[] = (expenses || []).map((exp) => ({
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
    return [...incomeEntries, ...expenseEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [income, expenses]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filterParam) {
      result = result.filter(
        (e) => e.category.toLowerCase() === filterParam.toLowerCase()
      );
    }
    if (rangeParam) {
      result = result.filter((e) => e.date === rangeParam);
    }
    return result;
  }, [entries, filterParam, rangeParam]);

  const clearFilters = () => {
    setSearchParams({});
  };

  const totalDebit = filteredEntries
    .filter((e) => e.type === "Expense")
    .reduce((s, e) => s + e.amount, 0);
  const totalCredit = filteredEntries
    .filter((e) => e.type === "Income")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">General Ledger</h1>
          <p className="text-sm text-slate-500">Granular transaction log</p>
        </div>
      </div>

      {(filterParam || rangeParam) && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-blue-700 font-medium">Active Filters:</span>
          {filterParam && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              Category: {filterParam}
            </Badge>
          )}
          {rangeParam && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              Date: {rangeParam}
            </Badge>
          )}
          <button onClick={clearFilters} className="ml-auto text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium">
            <X className="w-3 h-3" /> Clear Filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Entries</p>
          <p className="text-xl font-extrabold text-slate-900">{filteredEntries.length}</p>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Credits (Income)</p>
          <p className="text-xl font-extrabold text-emerald-600 tabular-nums">₦{totalCredit.toLocaleString()}</p>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Debits (Expenses)</p>
          <p className="text-xl font-extrabold text-rose-600 tabular-nums">₦{totalDebit.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Bank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      {filterParam || rangeParam
                        ? "No entries match the current filters."
                        : "No ledger entries yet."}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{entry.date}</td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${entry.type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {entry.type === "Income" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {entry.type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{entry.category}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                        {entry.description || entry.payee || "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${entry.type === "Income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {entry.type === "Income" ? "+" : "-"}₦{entry.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{entry.bank_name || entry.bank_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${STATUS_STYLES[entry.status]}`}>
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerPage;
