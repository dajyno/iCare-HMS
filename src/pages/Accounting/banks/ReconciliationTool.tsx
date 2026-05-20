import { useState } from "react";
import { ArrowLeft, Check, X, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_STYLES, generateId } from "../types";
import { useIncome, useExpenses } from "../hooks";
import type { BankAccount } from "../types";

interface Props {
  bank: BankAccount | null;
  onBack: () => void;
}

interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "Credit" | "Debit";
  matched: boolean;
}

const ReconciliationTool = ({ bank, onBack }: Props) => {
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"Credit" | "Debit">("Credit");

  if (!bank) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p>Select a bank account to reconcile.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const bankIncome = (income || []).filter((i) => i.bank_id === bank.bank_id);
  const bankExpenses = (expenses || []).filter((e) => e.bank_id === bank.bank_id);

  const internalTxns = [
    ...bankIncome.map((i) => ({ id: i.id, date: i.date, desc: i.description, amount: i.amount, type: "Credit" as const, status: i.status })),
    ...bankExpenses.map((e) => ({ id: e.id, date: e.date, desc: e.description, amount: e.amount, type: "Debit" as const, status: e.status })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const addStatementLine = () => {
    if (!newDesc || !newAmount) return;
    setStatementLines((prev) => [
      {
        id: generateId("STMT"),
        date: newDate,
        description: newDesc,
        amount: parseFloat(newAmount),
        type: newType,
        matched: false,
      },
      ...prev,
    ]);
    setNewDesc("");
    setNewAmount("");
  };

  const internalTotal = internalTxns.reduce((s, t) => s + t.amount, 0);
  const statementTotal = statementLines.reduce((s, l) => s + l.amount, 0);
  const matchCount = statementLines.filter((l) => l.matched).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="xs" onClick={onBack} className="h-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reconciliation</h1>
          <p className="text-sm text-slate-500">{bank.bank_name} — {bank.account_name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700">Internal Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {internalTxns.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No transactions for this account.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {internalTxns.map((tx) => (
                  <div key={tx.id} className="px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{tx.desc || tx.id}</p>
                      <p className="text-[11px] text-slate-400">{tx.date}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`font-bold tabular-nums ${tx.type === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.type === "Credit" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[tx.status]}`}>{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700">Bank Statement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Statement Entry</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Description</Label>
                  <Input placeholder="Statement line" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Amount</Label>
                  <Input type="number" step="0.01" placeholder="0" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button size="xs" variant={newType === "Credit" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setNewType("Credit")}>Credit</Button>
                  <Button size="xs" variant={newType === "Debit" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setNewType("Debit")}>Debit</Button>
                </div>
                <Button size="xs" className="h-7 gap-1 ml-auto" onClick={addStatementLine}>
                  <Plus className="w-3 h-3" /> Add Line
                </Button>
              </div>
            </div>
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {statementLines.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No statement entries added yet.</div>
              ) : (
                statementLines.map((line) => (
                  <div key={line.id} className="px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{line.description}</p>
                      <p className="text-[11px] text-slate-400">{line.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold tabular-nums ${line.type === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>
                        {line.type === "Credit" ? "+" : "-"}₦{line.amount.toLocaleString()}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${line.matched ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-500"}`}>
                        {line.matched ? "Matched" : "Unmatched"}
                      </Badge>
                      {!line.matched && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-6 text-xs gap-1"
                          onClick={() =>
                            setStatementLines((prev) =>
                              prev.map((l) => (l.id === line.id ? { ...l, matched: true } : l))
                            )
                          }
                        >
                          <Check className="w-3 h-3" /> Match
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between bg-white rounded-xl border shadow-sm px-6 py-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-400 text-xs">Internal Total</span>
            <p className="font-bold text-slate-900 tabular-nums">₦{internalTotal.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Statement Total</span>
            <p className="font-bold text-slate-900 tabular-nums">₦{statementTotal.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Matched Lines</span>
            <p className="font-bold text-slate-900">{matchCount}/{statementLines.length}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-3 h-3" />
          Balances update after verification
        </div>
      </div>
    </div>
  );
};

export default ReconciliationTool;
