import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Printer, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STATUS_STYLES, SOURCE_STYLES } from "./billingTypes";
import { useUpdateInvoiceStatus } from "./billingHooks";
import type { InvoiceSummary } from "./billingTypes";

interface InvoiceActionDrawerProps {
  invoice: InvoiceSummary | null;
  open: boolean;
  onClose: () => void;
}

const InvoiceActionDrawer = ({ invoice, open, onClose }: InvoiceActionDrawerProps) => {
  const updateStatus = useUpdateInvoiceStatus();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleProcessPayment = () => {
    if (!invoice) return;
    updateStatus.mutate({
      id: invoice.id,
      status: "Paid",
      amountPaid: invoice.balance,
    });
  };

  const handleGeneratePrint = () => {
    window.print();
  };

  const subtotal = invoice?.items?.reduce((s, i) => s + i.total, 0) ?? 0;

  return (
    <AnimatePresence>
      {open && invoice && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-slate-900">
                        {invoice.invoiceNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[invoice.status] ?? "bg-slate-50 text-slate-600"}`}
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(invoice.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {invoice.patient?.firstName} {invoice.patient?.lastName}
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    {invoice.patient?.patientId}
                  </p>
                  <div className="pt-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${SOURCE_STYLES[invoice.sourceType] ?? "bg-slate-50 text-slate-600"}`}
                    >
                      {invoice.sourceType}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Line Items
                  </h4>
                  <div className="space-y-2">
                    {invoice.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Qty: {item.quantity} × ₦{item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums ml-4">
                          ₦{item.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {(!invoice.items || invoice.items.length === 0) && (
                      <p className="text-sm text-slate-400 italic">No line items</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      ₦{subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Amount Paid</span>
                    <span className="font-mono tabular-nums text-emerald-600">
                      ₦{invoice.amountPaid.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">Balance Due</span>
                    <span className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                      ₦{invoice.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 rounded-b-2xl px-6 py-4 space-y-2">
                {updateStatus.error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {(updateStatus.error as any)?.message || "Failed to update payment status"}
                  </p>
                )}

                {updateStatus.isPending && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                    Processing payment...
                  </p>
                )}

                {invoice.status === "Paid" ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3">
                    <CheckCircle className="w-4 h-4" />
                    Payment received on{" "}
                    {new Date(invoice.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                ) : (
                  <Button
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                    onClick={handleProcessPayment}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {updateStatus.isPending
                      ? "Processing..."
                      : invoice.status === "PartiallyPaid"
                        ? "Process Remaining Payment"
                        : "Process Payment"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full h-10 gap-2"
                  onClick={handleGeneratePrint}
                >
                  <Printer className="w-4 h-4" />
                  Generate Print Invoice
                </Button>

                <div className="flex justify-center pt-1">
                  <button
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InvoiceActionDrawer;
