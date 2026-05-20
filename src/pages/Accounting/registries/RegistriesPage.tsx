import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIncome, useExpenses, useBankAccounts } from "../hooks";
import { STATUS_STYLES } from "../types";
import NewIncomeModal from "./NewIncomeModal";
import NewExpenseModal from "./NewExpenseModal";

const PAGE_SIZE = 10;

const RegistriesPage = () => {
  const { data: income, isLoading: incLoading } = useIncome();
  const { data: expenses, isLoading: expLoading } = useExpenses();
  const { data: banks } = useBankAccounts();
  const [showNewIncome, setShowNewIncome] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("income");
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);

  const filteredIncome = useMemo(
    () =>
      (income || []).filter(
        (i) =>
          i.category.toLowerCase().includes(search.toLowerCase()) ||
          i.description?.toLowerCase().includes(search.toLowerCase())
      ),
    [income, search]
  );

  const filteredExpenses = useMemo(
    () =>
      (expenses || []).filter(
        (e) =>
          e.category.toLowerCase().includes(search.toLowerCase()) ||
          e.description?.toLowerCase().includes(search.toLowerCase()) ||
          e.payee?.toLowerCase().includes(search.toLowerCase())
      ),
    [expenses, search]
  );

  const incomePages = Math.max(1, Math.ceil(filteredIncome.length / PAGE_SIZE));
  const expensePages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));

  const paginatedIncome = filteredIncome.slice((incomePage - 1) * PAGE_SIZE, incomePage * PAGE_SIZE);
  const paginatedExpenses = filteredExpenses.slice((expensePage - 1) * PAGE_SIZE, expensePage * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Income & Expenses</h1>
          <p className="text-sm text-slate-500">Register and manage financial entries</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => setShowNewIncome(true)}>
            <Plus className="w-3.5 h-3.5" /> New Income
          </Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={() => setShowNewExpense(true)}>
            <Plus className="w-3.5 h-3.5" /> New Expense
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => { setTab(v); setIncomePage(1); setExpensePage(1); }}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIncomePage(1); setExpensePage(1); }}
              placeholder="Search entries..."
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        <TabsContent value="income" className="mt-4">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-0">
              {incLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Bank</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedIncome.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No income entries found.</td></tr>
                      ) : (
                        paginatedIncome.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{inc.id}</td>
                            <td className="px-4 py-3 text-slate-600 tabular-nums">{inc.date}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{inc.category}</Badge></td>
                            <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{inc.description || "—"}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">₦{inc.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{inc.bank_name || inc.bank_id}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] font-semibold ${STATUS_STYLES[inc.status]}`}>{inc.status}</Badge></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {filteredIncome.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-1 mt-4">
              <div className="text-xs text-slate-400">
                Showing {(incomePage - 1) * PAGE_SIZE + 1}–{Math.min(incomePage * PAGE_SIZE, filteredIncome.length)} of {filteredIncome.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={incomePage <= 1} onClick={() => setIncomePage((p) => Math.max(1, p - 1))}>Previous</Button>
                {Array.from({ length: Math.min(incomePages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(incomePage - 2, incomePages - 4));
                  return start + i;
                }).map((page) => (
                  <button key={page} onClick={() => setIncomePage(page)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page === incomePage ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{page}</button>
                ))}
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={incomePage >= incomePages} onClick={() => setIncomePage((p) => Math.min(incomePages, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-0">
              {expLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Payee</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Bank</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedExpenses.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No expense entries found.</td></tr>
                      ) : (
                        paginatedExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-amber-600 font-bold">{exp.id}</td>
                            <td className="px-4 py-3 text-slate-600 tabular-nums">{exp.date}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">{exp.category}</Badge></td>
                            <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{exp.payee || "—"}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">₦{exp.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{exp.bank_name || exp.bank_id}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] font-semibold ${STATUS_STYLES[exp.status]}`}>{exp.status}</Badge></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {filteredExpenses.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-1 mt-4">
              <div className="text-xs text-slate-400">
                Showing {(expensePage - 1) * PAGE_SIZE + 1}–{Math.min(expensePage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={expensePage <= 1} onClick={() => setExpensePage((p) => Math.max(1, p - 1))}>Previous</Button>
                {Array.from({ length: Math.min(expensePages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(expensePage - 2, expensePages - 4));
                  return start + i;
                }).map((page) => (
                  <button key={page} onClick={() => setExpensePage(page)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page === expensePage ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{page}</button>
                ))}
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={expensePage >= expensePages} onClick={() => setExpensePage((p) => Math.min(expensePages, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewIncomeModal open={showNewIncome} onClose={() => setShowNewIncome(false)} banks={banks || []} />
      <NewExpenseModal open={showNewExpense} onClose={() => setShowNewExpense(false)} banks={banks || []} />
    </div>
  );
};

export default RegistriesPage;
