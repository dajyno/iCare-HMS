import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  RefreshCw,
  Check,
  X,
  Loader2,
  Banknote,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/src/components/skeletons/TableSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useInvoices, useUpdateInvoiceStatus } from "./billingHooks";
import {
  SOURCE_TABS,
  STATUS_STYLES,
  SOURCE_STYLES,
  type InvoiceSummary,
} from "./billingTypes";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoiceActionDrawer from "./InvoiceActionDrawer";
import { useBankAccounts } from "../Accounting/hooks";
import SearchableSelect from "@/components/ui/searchable-select";
import type { SearchableOption } from "@/components/ui/searchable-select";

type FilterTab = (typeof SOURCE_TABS)[number];

const BillingOverview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const updateStatus = useUpdateInvoiceStatus();

  const result = useInvoices();
  const invoices = result.data;
  const { isLoading, error, isFetching, refetch } = result;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];

    const seen = new Set<string>();
    const deduped: InvoiceSummary[] = [];
    for (const inv of invoices) {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        deduped.push(inv);
      }
    }

    let list = deduped;

    if (statusFilter === "paid") {
      list = list.filter((inv) => inv.status === "Paid");
    } else if (statusFilter === "unpaid") {
      list = list.filter((inv) => inv.status === "Unpaid");
    }

    if (statusFilter === "all" && activeFilter !== "All") {
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
  }, [invoices, activeFilter, statusFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, statusFilter, searchTerm]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));

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
    if (selectedIds.size === paginatedInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((inv) => inv.id)));
    }
  }, [paginatedInvoices, selectedIds]);

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
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [bulkPayMethod, setBulkPayMethod] = useState<"Cash" | "Card" | "Bank Transfer" | "Insurance Split">("Cash");
  const [bulkBankAccountId, setBulkBankAccountId] = useState<string | null>(null);
  const { data: bankAccounts } = useBankAccounts();

  useEffect(() => {
    if (bulkPayMethod === "Cash") setBulkBankAccountId(null);
  }, [bulkPayMethod]);

  const handleBulkPay = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowBulkPayModal(true);
  }, [selectedIds]);

  const handleConfirmBulkPay = useCallback(async () => {
    if (selectedIds.size === 0 || bulkPaying) return;
    if (bulkPayMethod !== "Cash" && !bulkBankAccountId) return;
    setBulkPaying(true);
    setShowBulkPayModal(false);
    const ids: string[] = Array.from(selectedIds);
    for (const id of ids) {
      const inv = (invoices as InvoiceSummary[] | undefined)?.find((i: InvoiceSummary) => i.id === id);
      if (inv && inv.status !== "Paid") {
        await updateStatus.mutateAsync({ id, amountPaid: inv.balance as number, paymentMethod: bulkPayMethod, bankAccountId: bulkBankAccountId });
      }
    }
    clearSelection();
    setBulkPaying(false);
  }, [selectedIds, invoices, updateStatus, clearSelection, bulkPaying, bulkPayMethod, bulkBankAccountId]);

  const handleRowClick = (inv: InvoiceSummary) => {
    setSelectedInvoice(inv);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">
            Track payments, invoices and hospital revenue
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
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
            onClick={() => { setActiveFilter(tab); setStatusFilter("all"); clearSelection(); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === tab
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            {tab === "All" ? "All Sources" : tab}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
        <button
          onClick={() => { setStatusFilter(statusFilter === "unpaid" ? "all" : "unpaid"); setActiveFilter("All"); clearSelection(); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "unpaid"
              ? "bg-red-600 text-white shadow-sm ring-2 ring-red-300"
              : "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
          }`}
        >
          <X className="w-3 h-3 inline mr-1 -mt-0.5" />
          Unpaid Invoices
        </button>
        <button
          onClick={() => { setStatusFilter(statusFilter === "paid" ? "all" : "paid"); setActiveFilter("All"); clearSelection(); }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "paid"
              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <Check className="w-3 h-3 inline mr-1 -mt-0.5" />
          Paid Invoices
        </button>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="relative w-full sm:max-w-xs">
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
            {paginatedInvoices.length < filteredInvoices.length && (
              <span className="ml-1">(page {currentPage}/{totalPages})</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} columns={6} searchable={false} />
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
                      {selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 ? (
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
                  {paginatedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic">
                        {searchTerm
                          ? "No invoices match your search or filter."
                          : "No invoices yet. Click '+ New Invoice' to create one."}
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((inv) => {
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
                          <td className="px-4 py-4 whitespace-nowrap truncate max-w-[220px]">
                            <div>
                              <span className="font-semibold text-slate-900">
                                {inv.patient?.firstName} {inv.patient?.lastName}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400">
                                {inv.patient?.patientId}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[140px] whitespace-normal align-top">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold whitespace-normal text-left h-auto leading-snug py-1 ${
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

      {/* Pagination */}
      {filteredInvoices.length > pageSize && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-400">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  page === currentPage
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bulk Pay Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white rounded-2xl shadow-xl ring-1 ring-blue-200/40 border border-blue-100/50 px-6 py-4 flex items-center gap-6"
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

      {/* Bulk Pay Method Modal */}
      <Dialog open={showBulkPayModal} onOpenChange={setShowBulkPayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Bulk Payment</DialogTitle>
            <DialogDescription>
              Select payment method for {selectedIds.size} invoice{selectedIds.size !== 1 ? "s" : ""} (₦{selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(["Cash", "Card", "Bank Transfer", "Insurance Split"] as const).map((method) => (
              <label
                key={method}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  bulkPayMethod === method
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="bulkPayMethod"
                  value={method}
                  checked={bulkPayMethod === method}
                  onChange={() => setBulkPayMethod(method)}
                  className="accent-blue-600"
                />
                <div className="flex items-center gap-2">
                  {method === "Cash" && <Banknote className="w-4 h-4 text-emerald-600" />}
                  {method === "Card" && <CreditCard className="w-4 h-4 text-blue-600" />}
                  {method === "Bank Transfer" && <CreditCard className="w-4 h-4 text-purple-600" />}
                  {method === "Insurance Split" && <CreditCard className="w-4 h-4 text-amber-600" />}
                  <span className="text-sm font-medium">{method}</span>
                </div>
              </label>
            ))}

            {bulkPayMethod !== "Cash" && (
              <div className="pt-2">
                <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Deposit to Bank Account
                </Label>
                <SearchableSelect
                  value={bulkBankAccountId ?? undefined}
                  onValueChange={(v) => setBulkBankAccountId(v)}
                  options={(bankAccounts ?? []).map(
                    (b): SearchableOption => ({
                      value: b.bank_id,
                      label: b.bank_name,
                    })
                  )}
                  placeholder="Select bank account..."
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              onClick={handleConfirmBulkPay}
              disabled={bulkPaying || (bulkPayMethod !== "Cash" && !bulkBankAccountId)}
            >
              {bulkPaying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {bulkPaying ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
