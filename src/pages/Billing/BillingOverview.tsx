import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  RefreshCw,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoices, useUpdateInvoiceStatus } from "./billingHooks";
import {
  SOURCE_TABS,
  STATUS_STYLES,
  SOURCE_STYLES,
  type InvoiceSummary,
} from "./billingTypes";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoiceActionDrawer from "./InvoiceActionDrawer";

type FilterTab = (typeof SOURCE_TABS)[number];

const BillingOverview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const updateStatus = useUpdateInvoiceStatus();

  const result = useInvoices();
  const invoices = result.data;
  const { isLoading, error, refetch } = result;

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    let list = invoices;

    if (activeFilter !== "All") {
      list = list.filter(
        (inv) => inv.sourceType?.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          `${inv.patient?.firstName ?? ""} ${inv.patient?.lastName ?? ""}`
            .toLowerCase()
            .includes(q) ||
          inv.patient?.patientId?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [invoices, activeFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalOutstanding = Array.isArray(invoices)
      ? invoices
          .filter((inv) => inv.status !== "Paid")
          .reduce((sum, inv) => sum + (inv.balance ?? 0), 0)
      : 0;

    const today = new Date().toDateString();
    const collectedToday = Array.isArray(invoices)
      ? invoices
          .filter(
            (inv) =>
              inv.status === "Paid" &&
              new Date(inv.updatedAt).toDateString() === today
          )
          .reduce((sum, inv) => sum + (inv.amountPaid ?? 0), 0)
      : 0;

    const pendingClaims = Array.isArray(invoices)
      ? invoices.filter((inv) => inv.status === "Unpaid").length
      : 0;

    const refundsIssued = Array.isArray(invoices)
      ? invoices
          .filter((inv) => inv.status === "Refunded")
          .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0)
      : 0;

    return { totalOutstanding, collectedToday, pendingClaims, refundsIssued };
  }, [invoices]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  }, [filteredInvoices, selectedIds]);

  const computeTotal = () => {
    let total = 0;
    for (const id of Array.from(selectedIds)) {
      const inv = (invoices as InvoiceSummary[] | undefined)?.find((i: InvoiceSummary) => i.id === id);
      total += (inv?.balance as number) ?? 0;
    }
    return total;
  };
  const selectedTotal = useMemo(computeTotal, [selectedIds, invoices]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const [bulkPaying, setBulkPaying] = useState(false);

  const handleBulkPay = useCallback(async () => {
    if (selectedIds.size === 0 || bulkPaying) return;
    setBulkPaying(true);
    const ids: string[] = Array.from(selectedIds);
    for (const id of ids) {
      const inv = (invoices as InvoiceSummary[] | undefined)?.find((i: InvoiceSummary) => i.id === id);
      if (inv && inv.status !== "Paid") {
        await updateStatus.mutateAsync({ id, status: "Paid", amountPaid: inv.balance as number });
      }
    }
    clearSelection();
    setBulkPaying(false);
  }, [selectedIds, invoices, updateStatus, clearSelection, bulkPaying]);

  const handleRowClick = (inv: InvoiceSummary) => {
    setSelectedInvoice(inv);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">
            Track payments, invoices and hospital revenue
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
            onClick={() => setShowNewInvoice(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
              ₦{stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Collected Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              ₦{stats.collectedToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Pending Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
              {stats.pendingClaims}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Refunds Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
              ₦{stats.refundsIssued.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick-Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveFilter(tab); clearSelection(); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === tab
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            {tab === "All" ? "All Sources" : tab}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice, patient, or folder ID..."
              className="pl-9 bg-white h-9"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading invoices...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">Failed to load invoices.</p>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      className="flex items-center justify-center w-5 h-5 rounded border border-slate-300 hover:border-slate-500 transition-colors"
                    >
                      {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                        <Check className="w-3 h-3 text-blue-600" />
                      ) : null}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Patient Info
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Billing Source
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Payment Status
                  </th>
                </tr>
              </thead>
              <AnimatePresence mode="wait">
                <motion.tbody
                  key={activeFilter + searchTerm}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="divide-y divide-slate-100"
                >
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic">
                        {searchTerm
                          ? "No invoices match your search or filter."
                          : "No invoices yet. Click '+ New Invoice' to create one."}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isChecked = selectedIds.has(inv.id);
                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? "bg-blue-50/30" : ""}`}
                          onClick={() => handleRowClick(inv)}
                        >
                          <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleSelection(inv.id)}
                              className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                                isChecked
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 hover:border-slate-500"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-bold text-blue-600">
                              {inv.invoiceNumber}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500 tabular-nums whitespace-nowrap">
                            {format(new Date(inv.createdAt), "dd-MMM-yyyy - HH:mm")}
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <span className="font-semibold text-slate-900">
                                {inv.patient?.firstName} {inv.patient?.lastName}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400">
                                {inv.patient?.patientId}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                SOURCE_STYLES[inv.sourceType] ?? "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {inv.sourceType || "General"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-900 tabular-nums">
                            ₦
                            {(inv.totalAmount ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                STATUS_STYLES[inv.status] ?? "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bulk Pay Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 px-6 py-4 flex items-center gap-6"
          >
            <button
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 whitespace-nowrap">
              <strong className="text-slate-900">{selectedIds.size}</strong> invoice
              {selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Total
              </span>
              <span className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
                ₦{selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Button
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6"
              onClick={handleBulkPay}
              disabled={bulkPaying}
            >
              {bulkPaying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {bulkPaying ? "Paying..." : "Pay Selected"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Invoice Modal */}
      <NewInvoiceModal
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
      />

      {/* Action Drawer */}
      <InvoiceActionDrawer
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};

export default BillingOverview;
