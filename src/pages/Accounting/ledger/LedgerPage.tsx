import React, { useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, Printer, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncome, useExpenses } from "../hooks";
import { STATUS_STYLES, type LedgerEntry as LedgerEntryType } from "../types";

const LedgerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const rangeParam = searchParams.get("range");
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();

  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>(filterParam || "All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
      payment_method: inc.payment_method,
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
      payment_method: exp.payment_method,
    }));
    return [...incomeEntries, ...expenseEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [income, expenses]);

  const allCategories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category));
    return Array.from(cats).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (categoryFilter && categoryFilter !== "All") {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (typeFilter && typeFilter !== "All") {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (dateFrom) {
      result = result.filter((e) => e.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.date <= dateTo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.payee?.toLowerCase().includes(q) ||
          e.bank_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, categoryFilter, typeFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalDebit = filteredEntries
    .filter((e) => e.type === "Expense")
    .reduce((s, e) => s + e.amount, 0);
  const totalCredit = filteredEntries
    .filter((e) => e.type === "Income")
    .reduce((s, e) => s + e.amount, 0);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = paginatedEntries
      .map(
        (e) => `<tr>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.date}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.type}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.category}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.description || e.payee || "—"}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px;text-align:right">₦${e.amount.toLocaleString()}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.bank_name}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px">${e.status}</td>
        </tr>`
      )
      .join("");
    printWindow.document.write(`
      <html><head><title>General Ledger</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}
      h2{margin-bottom:5px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:11px;text-align:left}
      .summary{margin-bottom:15px;font-size:13px;color:#555}
      </style></head><body>
      <h2>General Ledger</h2>
      <div class="summary">
        Period: ${dateFrom || "All"} — ${dateTo || "All"} |
        Category: ${categoryFilter} |
        Type: ${typeFilter} |
        Total Credits: ₦${totalCredit.toLocaleString()} |
        Total Debits: ₦${totalDebit.toLocaleString()}
      </div>
      <table>
        <thead><tr>
          <th>Date</th><th>Type</th><th>Category</th><th>Description</th>
          <th style="text-align:right">Amount</th><th>Bank</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;font-size:11px;color:#999;text-align:center">
        Generated by iCare HMS — ${new Date().toLocaleDateString()}
      </p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">General Ledger</h1>
          <p className="text-sm text-slate-500">Granular transaction log</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Filters</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[140px]">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="All">All Categories</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="All">All Types</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">To</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search entries..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <button
            onClick={() => { setCategoryFilter("All"); setTypeFilter("All"); setDateFrom(""); setDateTo(""); setSearch(""); setCurrentPage(1); }}
            className="h-8 px-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

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

      <Card className="border-none shadow-sm ring-1 ring-slate-200" ref={printRef}>
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
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
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
                      {expandedRow === entry.id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="font-semibold text-slate-500">Payment Method</span>
                                <p className="text-slate-800 mt-0.5">{entry.payment_method || "—"}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Payee</span>
                                <p className="text-slate-800 mt-0.5">{entry.payee || "—"}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Bank Account</span>
                                <p className="text-slate-800 mt-0.5">{entry.bank_name || entry.bank_id || "—"}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Source ID</span>
                                <p className="text-slate-800 mt-0.5 font-mono">{entry.source_id}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Full Description</span>
                                <p className="text-slate-800 mt-0.5 break-words">{entry.description || entry.payee || "—"}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Transaction Type</span>
                                <p className="text-slate-800 mt-0.5">{entry.type === "Income" ? "Income (Credit)" : "Expense (Debit)"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredEntries.length > pageSize && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length}
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-slate-400">Per page</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 rounded-lg border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
              return start + i;
            }).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  page === currentPage ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            ))}
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerPage;
