import { useState } from "react";
import { Plus, Building2, Wallet, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBankAccounts } from "../hooks";
import NewBankModal from "./NewBankModal";
import ReconciliationTool from "./ReconciliationTool";

const BanksPage = () => {
  const { data: banks, isLoading } = useBankAccounts();
  const [showNewBank, setShowNewBank] = useState(false);
  const [reconcileBankId, setReconcileBankId] = useState<string | null>(null);

  const totalBalance = banks?.reduce((s, b) => s + b.balance, 0) || 0;

  if (reconcileBankId) {
    const bank = banks?.find((b) => b.bank_id === reconcileBankId);
    return (
      <ReconciliationTool
        bank={bank || null}
        onBack={() => setReconcileBankId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Manager</h1>
          <p className="text-sm text-slate-500">Manage bank accounts and reconciliation</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNewBank(true)}>
          <Plus className="w-3.5 h-3.5" /> New Bank Account
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{banks?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregate Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">₦{totalBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
              ₦{banks?.length ? Math.round(totalBalance / banks.length).toLocaleString() : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : !banks || banks.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No bank accounts configured.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {banks.map((bank) => (
                <div key={bank.bank_id} className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{bank.bank_name}</p>
                      <p className="text-xs text-slate-400">
                        {bank.account_name} · {bank.account_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900 tabular-nums">₦{bank.balance.toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="xs" className="h-7 gap-1" onClick={() => setReconcileBankId(bank.bank_id)}>
                      <ArrowLeftRight className="w-3 h-3" /> Reconcile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewBankModal open={showNewBank} onClose={() => setShowNewBank(false)} />
    </div>
  );
};

export default BanksPage;
