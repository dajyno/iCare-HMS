import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { BarChart3, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIncome, useExpenses, useIncomeCategories, useExpenseCategories } from "../hooks";

const ReportsPage = () => {
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();

  const verifiedIncome = useMemo(() => (income || []).filter((i) => i.status === "Verified"), [income]);
  const verifiedExpenses = useMemo(() => (expenses || []).filter((e) => e.status === "Verified"), [expenses]);

  const totalRevenue = verifiedIncome.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = verifiedExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const { data: incomeCats } = useIncomeCategories();
  const { data: expenseCats } = useExpenseCategories();

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedIncome.forEach((i) => { map[i.category] = (map[i.category] || 0) + i.amount; });
    return map;
  }, [verifiedIncome]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    verifiedExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [verifiedExpenses]);

  const handleDrillDown = (category: string) => {
    navigate(`/${hospital_slug}/accounting/ledger?filter=${encodeURIComponent(category)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <BarChart3 className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">P&L & Analytics</h1>
          <p className="text-sm text-slate-500">Profit & Loss summary with drill-down</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              ₦{totalRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{verifiedIncome.length} verified transactions</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
              ₦{totalExpenses.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{verifiedExpenses.length} verified transactions</p>
          </CardContent>
        </Card>
        <Card className={`border-none shadow-sm ring-1 ${netProfit >= 0 ? "ring-emerald-200 bg-emerald-50/30" : "ring-rose-200 bg-rose-50/30"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Profit / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold tabular-nums ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {netProfit >= 0 ? "+" : ""}₦{netProfit.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{netProfit >= 0 ? "Profitable" : "Loss-making"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.keys(incomeByCategory).length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No verified income yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(incomeCats || []).filter((c) => incomeByCategory[c.name]).map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleDrillDown(cat.name)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50/50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <span className="font-bold text-emerald-600 tabular-nums">
                    ₦{(incomeByCategory[cat.name] || 0).toLocaleString()}
                  </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.keys(expenseByCategory).length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No verified expenses yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(expenseCats || []).filter((c) => expenseByCategory[c.name]).map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleDrillDown(cat.name)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-rose-50/50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                  <span className="font-bold text-rose-600 tabular-nums">
                    ₦{(expenseByCategory[cat.name] || 0).toLocaleString()}
                  </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 text-sm">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/${hospital_slug}/accounting/ledger`)}>
          View Full Ledger <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default ReportsPage;
