import { useState } from "react";
import { Download, ArrowRightLeft } from "lucide-react";
import RevenueKPICards from "./components/RevenueKPICards";
import TransactionLedger from "./components/TransactionLedger";
import PaymentChannelSplit from "./components/PaymentChannelSplit";
import UnreconciledDiscrepancyCard from "./components/UnreconciledDiscrepancyCard";
import { useRevenueDashboard } from "./hooks";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function RevenueDashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const { data, isLoading } = useRevenueDashboard(selectedDate);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-slate-900 font-bold text-2xl tracking-tight">Daily Revenue Collections</h1>
          <p className="text-sm text-slate-500">Real-time financial reconciliation and channel tracking for active shifts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-4 py-2 text-sm font-semibold rounded-xl transition-all">
            <Download className="w-4 h-4" />
            Download Settlement Sheet
          </button>
          <button className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm shadow-blue-100 transition-all">
            <ArrowRightLeft className="w-4 h-4" />
            Close Shift &amp; Reconcile
          </button>
        </div>
      </div>

      <RevenueKPICards data={data?.summary} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <TransactionLedger
            transactions={data?.transactions}
            loading={isLoading}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <PaymentChannelSplit channels={data?.channels} loading={isLoading} />
          <UnreconciledDiscrepancyCard value={data?.summary.unreconciledDiscrepancy} />
        </div>
      </div>
    </div>
  );
}
