import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Check, X, RefreshCw, Plus, Save, Sparkles,
  Calendar, DollarSign, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { STATUS_STYLES, generateId } from "../types";
import {
  useIncome,
  useExpenses,
  useReconciliationSessions,
  useCreateReconciliationSession,
  useReconciliationEntries,
  useSaveReconciliationEntries,
  useCompleteReconciliation,
} from "../hooks";
import type { BankAccount, ReconciliationEntry, ReconciliationSession } from "../types";
import { autoMatch, type InternalTxn, type StatementLine, type MatchSuggestion } from "./reconciliationUtils";

interface Props {
  bank: BankAccount | null;
  onBack: () => void;
}

interface LocalLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "Credit" | "Debit";
  matchedId?: string;
}

const ReconciliationTool = ({ bank, onBack }: Props) => {
  const { data: income } = useIncome();
  const { data: expenses } = useExpenses();
  const { data: sessions } = useReconciliationSessions(bank?.bank_id || "");
  const createSession = useCreateReconciliationSession();
  const saveEntries = useSaveReconciliationEntries();
  const completeRecon = useCompleteReconciliation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { data: savedEntries } = useReconciliationEntries(activeSessionId || "");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const [lines, setLines] = useState<LocalLine[]>([]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"Credit" | "Debit">("Credit");

  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load saved entries when switching sessions
  useEffect(() => {
    if (savedEntries) {
      setLines(
        savedEntries.map((e) => ({
          id: e.id,
          date: e.statement_date,
          description: e.statement_description || "",
          amount: e.statement_amount,
          type: e.statement_type,
          matchedId: e.source_id || undefined,
        }))
      );
    } else {
      setLines([]);
    }
  }, [savedEntries]);

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

  const activeSession = sessions?.find((s) => s.id === activeSessionId);

  // Internal transactions for this bank, filtered by session period and unreconciled only
  const bankIncome = (income || []).filter(
    (i) => i.bank_id === bank.bank_id && !i.reconciled_at
  );
  const bankExpenses = (expenses || []).filter(
    (e) => e.bank_id === bank.bank_id && !e.reconciled_at
  );

  const internalTxns: InternalTxn[] = [
    ...bankIncome.map((i) => ({
      id: i.id,
      date: i.date,
      desc: i.description,
      amount: i.amount,
      type: "Credit" as const,
      status: i.status,
    })),
    ...bankExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      desc: e.description,
      amount: e.amount,
      type: "Debit" as const,
      status: e.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter internal transactions by session period if active
  const filteredInternal = activeSession
    ? internalTxns.filter(
        (t) => t.date >= activeSession.period_start && t.date <= activeSession.period_end
      )
    : internalTxns;

  const internalTotal = filteredInternal.reduce((s, t) => s + t.amount, 0);
  const statementTotal = lines.reduce((s, l) => s + l.amount, 0);
  const matchCount = lines.filter((l) => l.matchedId).length;

  const addLine = () => {
    if (!newDesc || !newAmount) return;
    setLines((prev) => [
      {
        id: generateId("STMT"),
        date: newDate,
        description: newDesc,
        amount: parseFloat(newAmount),
        type: newType,
      },
      ...prev,
    ]);
    setNewDesc("");
    setNewAmount("");
  };

  const toggleMatch = (lineId: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.id === lineId);
      if (!line) return prev;
      if (line.matchedId) {
        return prev.map((l) => (l.id === lineId ? { ...l, matchedId: undefined } : l));
      }
      // Auto-select the first internal transaction with matching amount and type
      const candidate = filteredInternal.find(
        (t) => t.amount === line.amount && t.type === line.type
      );
      return prev.map((l) =>
        l.id === lineId ? { ...l, matchedId: candidate?.id || "manual" } : l
      );
    });
  };

  const handleAutoMatch = () => {
    const stmtLines: StatementLine[] = lines
      .filter((l) => !l.matchedId)
      .map((l) => ({
        id: l.id,
        date: l.date,
        description: l.description,
        amount: l.amount,
        type: l.type,
      }));
    const result = autoMatch(filteredInternal, stmtLines);
    setSuggestions(result);
    setShowSuggestions(true);
  };

  const applySuggestions = () => {
    setLines((prev) =>
      prev.map((l) => {
        const suggestion = suggestions.find((s) => s.statementLineId === l.id);
        if (suggestion) {
          return { ...l, matchedId: suggestion.internalTxnId };
        }
        return l;
      })
    );
    setShowSuggestions(false);
  };

  const handleCreateSession = async () => {
    if (!periodStart || !periodEnd) return;
    try {
      const result = await createSession.mutateAsync({
        bank_id: bank.bank_id,
        period_start: periodStart,
        period_end: periodEnd,
        opening_balance: parseFloat(openingBalance) || 0,
      });
      setActiveSessionId(result.id);
      setShowCreateForm(false);
      toast.success("Reconciliation session created");
    } catch {
      toast.error("Failed to create session");
    }
  };

  const handleSave = async () => {
    if (!activeSessionId) return;
    try {
      const entries: ReconciliationEntry[] = lines.map((l) => ({
        id: l.id,
        session_id: activeSessionId,
        source_type: l.type === "Credit" ? "Income" : "Expense",
        source_id: l.matchedId || null,
        statement_date: l.date,
        statement_description: l.description,
        statement_amount: l.amount,
        statement_type: l.type,
        match_type: l.matchedId ? "Manual" : "Manual",
        matched_at: l.matchedId ? new Date().toISOString() : null,
      }));
      await saveEntries.mutateAsync(entries);
      toast.success("Reconciliation entries saved");
    } catch {
      toast.error("Failed to save entries");
    }
  };

  const handleComplete = async () => {
    if (!activeSessionId) return;
    try {
      const matchedLines = lines.filter((l) => l.matchedId);
      await completeRecon.mutateAsync({
        sessionId: activeSessionId,
        closingBalance: parseFloat(openingBalance) + statementTotal,
        matchedEntryIds: matchedLines.map((l) => l.id),
      });
      setActiveSessionId(null);
      toast.success("Reconciliation completed");
    } catch {
      toast.error("Failed to complete reconciliation");
    }
  };

  // ── Session Selector / Create UI ──

  if (!activeSessionId && !showCreateForm) {
    const openSessions = sessions?.filter((s) => s.status === "Open") || [];
    const completedSessions = sessions?.filter((s) => s.status === "Completed") || [];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="xs" onClick={onBack} className="h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{bank.bank_name}</h1>
            <p className="text-sm text-slate-500">Select or create a reconciliation session</p>
          </div>
        </div>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700">Open Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openSessions.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No open reconciliation sessions.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {openSessions.map((s) => (
                  <div
                    key={s.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {s.period_start} — {s.period_end}
                      </p>
                      <p className="text-xs text-slate-400">
                        Opening: ₦{s.opening_balance.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      Open
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {completedSessions.length > 0 && (
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-700">Completed Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {completedSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {s.period_start} — {s.period_end}
                      </p>
                      <p className="text-xs text-slate-400">
                        Closing: ₦{s.closing_balance?.toLocaleString() || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      Completed
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button className="w-full gap-2" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4" /> New Reconciliation Session
        </Button>
      </div>
    );
  }

  // ── Create Session Form ──

  if (showCreateForm) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="xs" onClick={() => setShowCreateForm(false)} className="h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Reconciliation</h1>
            <p className="text-sm text-slate-500">{bank.bank_name} — {bank.account_name}</p>
          </div>
        </div>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Period Start</Label>
                <DatePicker value={periodStart} onChange={(v) => setPeriodStart(v)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs">Period End</Label>
                <DatePicker value={periodEnd} onChange={(v) => setPeriodEnd(v)} className="h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Opening Balance (from previous period)</Label>
              <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="h-10" />
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleCreateSession}
              disabled={!periodStart || !periodEnd || createSession.isPending}
            >
              {createSession.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Start Reconciliation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Active Reconciliation UI ──

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="xs" onClick={() => setActiveSessionId(null)} className="h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reconciliation</h1>
            <p className="text-sm text-slate-500">
              {bank.bank_name} — {activeSession?.period_start} to {activeSession?.period_end}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={saveEntries.isPending}>
            {saveEntries.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleComplete}
            disabled={completeRecon.isPending}
          >
            {completeRecon.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Complete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Internal Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {filteredInternal.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No unreconciled transactions for this period.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInternal.map((tx) => (
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
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              Bank Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Statement Entry</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px]">Date</Label>
                  <DatePicker value={newDate} onChange={(v) => setNewDate(v)} className="h-8 text-xs" />
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
                <Button size="xs" className="h-7 gap-1 ml-auto" onClick={addLine}>
                  <Plus className="w-3 h-3" /> Add Line
                </Button>
              </div>
            </div>
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {lines.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No statement entries added yet.</div>
              ) : (
                lines.map((line) => (
                  <div key={line.id} className="px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{line.description}</p>
                      <p className="text-[11px] text-slate-400">{line.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold tabular-nums ${line.type === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>
                        {line.type === "Credit" ? "+" : "-"}₦{line.amount.toLocaleString()}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${line.matchedId ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-500"}`}>
                        {line.matchedId ? "Matched" : "Unmatched"}
                      </Badge>
                      <Button
                        size="xs"
                        variant={line.matchedId ? "default" : "outline"}
                        className={`h-6 text-xs gap-1 ${line.matchedId ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                        onClick={() => toggleMatch(line.id)}
                      >
                        {line.matchedId ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                        {line.matchedId ? "Unmatch" : "Match"}
                      </Button>
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
            <span className="text-slate-400 text-xs">Opening Balance</span>
            <p className="font-bold text-slate-900 tabular-nums">₦{(activeSession?.opening_balance || 0).toLocaleString()}</p>
          </div>
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
            <p className="font-bold text-slate-900">{matchCount}/{lines.length}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAutoMatch} disabled={lines.length === 0}>
          <Sparkles className="w-3.5 h-3.5" /> Auto-Match
        </Button>
      </div>

      {/* Auto-Match Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto-Match Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No matching suggestions found.</p>
            ) : (
              suggestions.map((s) => {
                const stmt = lines.find((l) => l.id === s.statementLineId);
                const txn = filteredInternal.find((t) => t.id === s.internalTxnId);
                return (
                  <div
                    key={`${s.statementLineId}-${s.internalTxnId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 truncate">{stmt?.description}</p>
                      <p className="text-[10px] text-slate-400">Statement: ₦{stmt?.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-center px-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${s.confidence === "High" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                      >
                        {s.confidence}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5">score: {s.score}</p>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-xs font-medium text-slate-900 truncate">{txn?.desc || "—"}</p>
                      <p className="text-[10px] text-slate-400">Internal: ₦{txn?.amount.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestions(false)}>Cancel</Button>
            <Button onClick={applySuggestions} disabled={suggestions.length === 0}>
              Apply {suggestions.length} Match{suggestions.length !== 1 ? "es" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReconciliationTool;
