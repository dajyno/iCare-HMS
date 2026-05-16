import { format } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnalyticsBoard from "./AnalyticsBoard";
import { usePharmacyInvoices, useAnalyticsData } from "../hooks";

const statusStyles: Record<string, string> = {
  Unpaid: "bg-rose-50 text-rose-700 border-rose-100",
  PartiallyPaid: "bg-amber-50 text-amber-700 border-amber-100",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Refunded: "bg-slate-50 text-slate-500 border-slate-100",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-100",
};

const BillingAnalytics = () => {
  const { data: invoices, isLoading } = usePharmacyInvoices();
  const analytics = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Billing & Analytics</h1>
            <p className="text-sm text-slate-500">Revenue performance and invoice management</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading billing data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100">
            <BarChart3 className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Billing & Analytics</h1>
            <p className="text-xs text-slate-500">Revenue performance and invoice management</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              ₦{analytics.totalRevenue.toLocaleString()}
            </div>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {analytics.totalPrescriptions.toLocaleString()}
            </div>
            <Receipt className="w-5 h-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              ₦{analytics.avgOrderValue.toFixed(2)}
            </div>
            <TrendingUp className="w-5 h-5 text-sky-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {Array.isArray(invoices) ? invoices.length : 0}
            </div>
            <FileText className="w-5 h-5 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <AnalyticsBoard />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-sm font-bold text-slate-700">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Invoice No.</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(invoices) || invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                    {!Array.isArray(invoices) ? "Error loading invoices." : "No invoices found."}
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => {
                  const patientName = inv.patient
                    ? `${inv.patient.firstName ?? inv.patient.first_name ?? ""} ${inv.patient.lastName ?? inv.patient.last_name ?? ""}`.trim()
                    : "—";
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
                        ₦{(inv.totalAmount ?? inv.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${statusStyles[inv.status] ?? "bg-slate-50 text-slate-600"}`}
                        >
                          {inv.status ?? "Unknown"}
                        </Badge>
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

export default BillingAnalytics;
