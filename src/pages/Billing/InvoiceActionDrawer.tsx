import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Printer, CreditCard, Loader2, CheckCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { STATUS_STYLES, SOURCE_STYLES } from "./billingTypes";
import { useUpdateInvoiceStatus } from "./billingHooks";
import type { InvoiceSummary } from "./billingTypes";
import { getHospitalName } from "@/src/lib/hospitalConfig";
import { format } from "date-fns";
import { useBankAccounts } from "../Accounting/hooks";
import SearchableSelect from "@/components/ui/searchable-select";
import type { SearchableOption } from "@/components/ui/searchable-select";

interface InvoiceActionDrawerProps {
  invoice: InvoiceSummary | null;
  open: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Insurance Split"] as const;

const InvoiceActionDrawer = ({ invoice, open, onClose }: InvoiceActionDrawerProps) => {
  const updateStatus = useUpdateInvoiceStatus();
  const [payAmount, setPayAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "Bank Transfer" | "Insurance Split">("Cash");
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const { data: bankAccounts } = useBankAccounts();

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.balance);
      setPaymentMethod(invoice.paymentMethod as any || "Cash");
      setBankAccountId(null);
    }
  }, [invoice]);

  useEffect(() => {
    if (paymentMethod === "Cash") setBankAccountId(null);
  }, [paymentMethod]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleProcessPayment = () => {
    if (!invoice || payAmount <= 0) return;
    if (paymentMethod !== "Cash" && !bankAccountId) return;
    updateStatus.mutate(
      {
        id: invoice.id,
        amountPaid: payAmount,
        paymentMethod,
        bankAccountId,
      },
      { onSuccess: () => onClose() }
    );
  };

  const handleGeneratePrint = useCallback(() => {
    if (!invoice) return;
    const hospitalName = getHospitalName();
    const patientName = invoice.patient
      ? `${invoice.patient.firstName ?? ""} ${invoice.patient.lastName ?? ""}`.trim()
      : "—";
    const patientId = invoice.patient?.patientId ?? "—";
    const invDate = invoice.createdAt
      ? format(new Date(invoice.createdAt), "MMM dd, yyyy HH:mm")
      : "—";
    const paidDate = invoice.paidAt
      ? format(new Date(invoice.paidAt), "MMM dd, yyyy")
      : null;
    const itemsHtml = (invoice.items ?? [])
      .map(
        (item) => `
        <tr>
          <td class="cell">${item.description}</td>
          <td class="cell right">${item.quantity}</td>
          <td class="cell right">₦${item.unitPrice.toFixed(2)}</td>
          <td class="cell right">₦${item.total.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const subtotal = invoice.items?.reduce((s, i) => s + i.total, 0) ?? 0;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${hospitalName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
          .hospital-name { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .title { text-align: center; font-size: 16px; font-weight: 600; color: #005EB8; margin-bottom: 6px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 16px 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
          .meta-label { color: #64748b; }
          .meta-value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th { text-align: left; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 4px; border-bottom: 1px solid #e2e8f0; }
          th.right { text-align: right; }
          .cell { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; }
          .cell.right { text-align: right; font-family: 'Courier New', monospace; }
          .total-row td { padding: 10px 4px; font-weight: 700; border-top: 2px solid #e2e8f0; }
          .total-row td.right { font-size: 16px; font-family: 'Courier New', monospace; }
          .paid-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="hospital-name">${hospitalName}</div>
        <div class="title">Payment Receipt</div>
        <hr class="divider" />
        <div class="meta-row"><span class="meta-label">Invoice:</span><span class="meta-value">${invoice.invoiceNumber}</span></div>
        <div class="meta-row"><span class="meta-label">Patient:</span><span class="meta-value">${patientName}</span></div>
        <div class="meta-row"><span class="meta-label">Patient ID:</span><span class="meta-value">${patientId}</span></div>
        <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">${invDate}</span></div>
        <div class="meta-row"><span class="meta-label">Source:</span><span class="meta-value">${invoice.sourceType}</span></div>
        <div class="meta-row"><span class="meta-label">Status:</span><span class="meta-value"><span class="paid-badge">${invoice.status}</span></span></div>
        ${paidDate ? `<div class="meta-row"><span class="meta-label">Paid On:</span><span class="meta-value">${paidDate}</span></div>` : ""}
        ${invoice.paymentMethod ? `<div class="meta-row"><span class="meta-label">Payment Method:</span><span class="meta-value">${invoice.paymentMethod}</span></div>` : ""}
        <hr class="divider" />
        <table>
          <thead>
            <tr><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="3">Subtotal</td><td class="right">₦${subtotal.toFixed(2)}</td></tr>
            <tr class="total-row"><td colspan="3">Amount Paid</td><td class="right">₦${invoice.amountPaid.toFixed(2)}</td></tr>
            <tr class="total-row"><td colspan="3">Balance</td><td class="right">₦${invoice.balance.toFixed(2)}</td></tr>
          </tfoot>
        </table>
        <hr class="divider" />
        <div style="text-align:center; font-size:14px; font-weight:700; margin-top:4px;">
          Total Paid: ₦${invoice.amountPaid.toFixed(2)}
        </div>
        <div class="footer">This is a system-generated receipt from ${hospitalName}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }, [invoice]);

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
                      className={`text-[10px] font-semibold whitespace-normal text-left max-w-[200px] h-auto leading-tight py-1 ${SOURCE_STYLES[invoice.sourceType] ?? "bg-slate-50 text-slate-600"}`}
                    >
                      {invoice.sourceType}
                    </Badge>
                    {invoice.paidAt && (
                      <Badge variant="outline" className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Paid {new Date(invoice.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </Badge>
                    )}
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

                {/* Payment Input Section */}
                {invoice.status !== "Paid" && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Payment Amount (₦)
                      </Label>
                      <Input
                        type="text" inputMode="decimal"
                        value={payAmount === 0 ? "" : String(payAmount || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d*$/.test(v)) {
                            setPayAmount(Math.min(invoice.balance, Math.max(0, v === "" ? 0 : parseFloat(v))));
                          }
                        }}
                        className="h-9 bg-white font-mono"
                      />
                      <button
                        onClick={() => setPayAmount(invoice.balance)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 mt-1 font-medium"
                      >
                        Pay full balance (₦{invoice.balance.toFixed(2)})
                      </button>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Payment Method
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                              paymentMethod === method
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod !== "Cash" && (
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Deposit to Bank Account
                        </Label>
                        <SearchableSelect
                          value={bankAccountId ?? undefined}
                          onValueChange={(v) => setBankAccountId(v)}
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
                )}
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
                    Payment received{invoice.paidAt ? ` on ${new Date(invoice.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                    {invoice.paymentMethod && ` via ${invoice.paymentMethod}`}
                  </div>
                ) : (
                  <Button
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                    onClick={handleProcessPayment}
                    disabled={updateStatus.isPending || payAmount <= 0 || (paymentMethod !== "Cash" && !bankAccountId)}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {updateStatus.isPending
                      ? "Processing..."
                      : payAmount < invoice.balance
                        ? `Pay ₦${payAmount.toFixed(2)}`
                        : "Process Full Payment"}
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
