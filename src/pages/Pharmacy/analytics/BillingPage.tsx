import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Search, CreditCard, DollarSign, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, toCamel } from "@/src/lib/supabase";

const statusStyles: Record<string, string> = {
  Unpaid: "bg-rose-50 text-rose-700 border-rose-200",
  PartiallyPaid: "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Refunded: "bg-slate-50 text-slate-500 border-slate-200",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-200",
};

const BillingPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["pharmacy-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("*, patient:patients(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return toCamel(data) as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("invoices")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-invoices"] });
    },
  });

  const filtered = (Array.isArray(invoices) ? invoices : []).filter((inv: any) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const patientName = inv.patient
      ? `${inv.patient.firstName ?? inv.patient.first_name ?? ""} ${inv.patient.lastName ?? inv.patient.last_name ?? ""}`.toLowerCase()
      : "";
    const invNum = (inv.invoiceNumber ?? inv.invoice_number ?? "").toLowerCase();
    return invNum.includes(q) || patientName.includes(q);
  });

  const totalOutstanding = filtered.reduce(
    (s: number, inv: any) => s + ((inv.balance ?? inv.balance ?? 0)),
    0
  );
  const totalPaid = filtered
    .filter((inv: any) => inv.status === "Paid")
    .reduce((s: number, inv: any) => s + (inv.totalAmount ?? inv.total_amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Billing</h1>
            <p className="text-xs text-slate-500">Invoice management</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading invoices...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load invoices. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Billing</h1>
            <p className="text-xs text-slate-500">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["pharmacy-invoices"] })}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
              ₦{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <CreditCard className="w-5 h-5 text-rose-400" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collected</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              ₦{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {Array.isArray(invoices) ? invoices.length : 0}
            </div>
            <Receipt className="w-5 h-5 text-sky-400" />
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoices..."
              className="pl-9 h-9 text-sm bg-white border-slate-200"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Invoice No.</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Paid</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Balance</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 italic">
                    {searchTerm ? "No invoices match your search." : "No invoices found."}
                  </td>
                </tr>
              ) : (
                filtered.map((inv: any) => {
                  const patientName = inv.patient
                    ? `${inv.patient.firstName ?? inv.patient.first_name ?? ""} ${inv.patient.lastName ?? inv.patient.last_name ?? ""}`.trim()
                    : "—";
                  const totalAmount = inv.totalAmount ?? inv.total_amount ?? 0;
                  const amountPaid = inv.amountPaid ?? inv.amount_paid ?? 0;
                  const balance = inv.balance ?? 0;
                  const status = inv.status ?? "Unpaid";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-[11px] font-semibold text-slate-700">
                          {inv.invoiceNumber ?? inv.invoice_number ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">{patientName}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-slate-500">
                        {inv.createdAt ?? inv.created_at
                          ? format(new Date(inv.createdAt ?? inv.created_at), "MMM dd, yyyy")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        ₦{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-emerald-600">
                        ₦{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-rose-600">
                        ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? "bg-slate-50 text-slate-600"}`}
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {status === "Unpaid" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: "Paid" })}
                            disabled={updateStatus.isPending}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
