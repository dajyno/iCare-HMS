import { useState } from "react";
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIncome, useExpenses, useBankAccounts } from "../hooks";
import { STATUS_STYLES } from "../types";
import NewIncomeModal from "./NewIncomeModal";
import NewExpenseModal from "./NewExpenseModal";

const RegistriesPage = () => {
  const { data: income, isLoading: incLoading } = useIncome();
  const { data: expenses, isLoading: expLoading } = useExpenses();
  const { data: banks } = useBankAccounts();
  const [showNewIncome, setShowNewIncome] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("income");

  const filteredIncome = (income || []).filter(
    (i) =>
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExpenses = (expenses || []).filter(
    (e) =>
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.payee?.toLowerCase().includes(search.toLowerCase())
  );

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

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                      {filteredIncome.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No income entries found.</td></tr>
                      ) : (
                        filteredIncome.map((inc) => (
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
                      {filteredExpenses.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No expense entries found.</td></tr>
                      ) : (
                        filteredExpenses.map((exp) => (
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
        </TabsContent>
      </Tabs>

      <NewIncomeModal open={showNewIncome} onClose={() => setShowNewIncome(false)} banks={banks || []} />
      <NewExpenseModal open={showNewExpense} onClose={() => setShowNewExpense(false)} banks={banks || []} />
    </div>
  );
};

export default RegistriesPage;
