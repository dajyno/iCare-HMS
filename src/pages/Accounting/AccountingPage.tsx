import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calculator,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CheckCircle,
  Loader2,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBankAccounts, usePendingVerifications, useIncome, useExpenses, useVerifyTransaction } from "./hooks";
import { STATUS_STYLES } from "./types";
import VerificationModal from "./VerificationModal";
import NewIncomeModal from "./registries/NewIncomeModal";
import NewExpenseModal from "./registries/NewExpenseModal";

const AccountingPage = () => {
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const { data: banks } = useBankAccounts();
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();
  const pending = usePendingVerifications();
  const verifyTx = useVerifyTransaction();

  const [showNewIncome, setShowNewIncome] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<any>(null);

  const realizedRevenue =
    income?.filter((i) => i.status === "Verified").reduce((s, i) => s + i.amount, 0) || 0;
  const operationalExpenses =
    expenses?.filter((e) => e.status === "Verified").reduce((s, e) => s + e.amount, 0) || 0;
  const liquidity =
    banks?.reduce((s, b) => s + b.balance, 0) || 0;

  const handleVerify = async () => {
    if (!verifyTarget) return;
    await verifyTx.mutateAsync({
      id: verifyTarget.id,
      type: verifyTarget._type,
      bank_id: verifyTarget.bank_id || "CASH",
      amount: verifyTarget.amount,
    });
    setVerifyTarget(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Calculator className="w-8 h-8 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Accounting Hub</h1>
            <p className="text-sm text-slate-500">Financial command center</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              Realized Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              ₦{realizedRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {income?.filter((i) => i.status === "Verified").length || 0} verified transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              Operational Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
              ₦{operationalExpenses.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {expenses?.filter((e) => e.status === "Verified").length || 0} verified expenses
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              Liquidity (Total Bank)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
              ₦{liquidity.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across {banks?.length || 0} bank accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => setShowNewIncome(true)}>
          <Plus className="w-3.5 h-3.5" /> New Income
        </Button>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={() => setShowNewExpense(true)}>
          <Plus className="w-3.5 h-3.5" /> New Expense
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/${hospital_slug}/accounting/banks`)}>
          <Banknote className="w-3.5 h-3.5" /> Reconcile
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/${hospital_slug}/accounting/reports`)}>
          <Calculator className="w-3.5 h-3.5" /> View Reports
        </Button>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-500" />
            Pending Verification
            <Badge variant="outline" className="ml-auto text-xs bg-amber-50 text-amber-700 border-amber-200">
              {pending.data?.length || 0} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : !pending.data || pending.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No pending transactions. All caught up!</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pending.data.map((tx: any) => (
                <div
                  key={`${tx._type}-${tx.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setVerifyTarget(tx)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx._type === "Income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {tx._type === "Income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{tx.description || tx.category}</p>
                      <p className="text-[11px] text-slate-400">
                        {tx._type} · {tx.category} · {tx.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-slate-900 tabular-nums text-sm">₦{tx.amount.toLocaleString()}</span>
                    <Badge variant="outline" className={STATUS_STYLES.Pending}>Pending</Badge>
                    <Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7" onClick={(e) => { e.stopPropagation(); setVerifyTarget(tx); }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Verify
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewIncomeModal open={showNewIncome} onClose={() => setShowNewIncome(false)} banks={banks || []} />
      <NewExpenseModal open={showNewExpense} onClose={() => setShowNewExpense(false)} banks={banks || []} />
      <VerificationModal
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        transaction={verifyTarget}
        onConfirm={handleVerify}
        isPending={verifyTx.isPending}
      />
    </div>
  );
};

export default AccountingPage;
