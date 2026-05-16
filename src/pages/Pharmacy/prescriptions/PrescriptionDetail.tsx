import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { Pill, Calendar, User, Hash, X, CheckCircle2, Loader2, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PrescriptionBadge from "./PrescriptionBadge";
import { useDispense } from "../hooks";
import type { PharmacyPrescription } from "../types";

const PrescriptionDetail = ({
  prescription,
  onClose,
}: {
  prescription: PharmacyPrescription;
  onClose: () => void;
}) => {
  const [dispensedMap, setDispensedMap] = useState<Record<number, number>>({});
  const dispense = useDispense();
  const [dispenseError, setDispenseError] = useState<string | null>(null);
  const [dispenseResult, setDispenseResult] = useState<{
    invoiceNumber: string; totalCost: number; isPartial: boolean;
  } | null>(null);

  const activePrescription = useMemo(() => ({
    ...prescription,
    items: prescription.items.map((item, i) => ({
      ...item,
      qtyDispensed: dispensedMap[i] ?? 0,
    })),
  }), [prescription, dispensedMap]);

  const anyDispensed = (Object.values(dispensedMap) as number[]).some((v) => v > 0);

  const toggleItem = useCallback((index: number) => {
    setDispensedMap((prev: any) => {
      const already = prev[index] ?? 0;
      if (already > 0) {
        const next = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: prescription.items[index]?.qtyPrescribed ?? 1 };
    });
  }, [prescription]);

  const handleDispense = async () => {
    setDispenseError(null);
    if (!anyDispensed) {
      setDispenseError("Check at least one medication to dispense.");
      return;
    }
    try {
      const res = await dispense.mutateAsync(activePrescription);
      setDispenseResult({
        invoiceNumber: res.invoiceNumber,
        totalCost: res.totalCost,
        isPartial: res.isPartial,
      });
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Dispense failed";
      setDispenseError(msg);
      console.error("Dispense error:", err);
    }
  };

  if (dispenseResult) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{dispenseResult.isPartial ? "Partially dispensed" : "Dispensed successfully"}</span>
        </div>
        <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-xs text-slate-600">{dispenseResult.invoiceNumber}</span>
          </div>
          <span className="font-mono tabular-nums font-bold text-sky-700">
            ₦{dispenseResult.totalCost.toFixed(2)}
          </span>
        </div>
        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm h-10" onClick={onClose}>
          Back to Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200/60">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
            {prescription.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{prescription.patientName}</h2>
            <p className="text-[11px] text-slate-500 font-mono">{prescription.patientCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrescriptionBadge status={prescription.orderStatus} />
          <DialogClose className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </DialogClose>
        </div>
      </div>

      <div className="px-6 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-xs">{prescription.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">{prescription.prescribedBy.startsWith("Doctor") ? "Attending Physician" : prescription.prescribedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">Rx: {format(new Date(prescription.prescriptionDate), "MMM dd, yyyy")}</span>
          </div>
          {(prescription.orderStatus === "All Completed" || prescription.orderStatus === "Partially Completed") && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">Dispensed: {format(new Date(), "MMM dd, yyyy")}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Medications</h3>
          <div className="space-y-2">
            {activePrescription.items.map((item, i) => {
              const dispensed = item.qtyDispensed > 0;
              return (
                <motion.div
                  key={i}
                  layout
                  className={`rounded-xl border p-3.5 transition-all ${
                    dispensed ? "border-emerald-200/60 bg-emerald-50/40" : "border-slate-200/60 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleItem(i)}
                      className="mt-0.5 shrink-0"
                      disabled={prescription.orderStatus === "All Completed"}
                    >
                      <motion.div
                        layout
                        animate={
                          dispensed
                            ? { backgroundColor: "rgb(16 185 129)", borderColor: "rgb(16 185 129)" }
                            : { backgroundColor: "rgb(255 255 255)", borderColor: "rgb(203 213 225)" }
                        }
                        transition={{ type: "spring", mass: 0.5, damping: 12 }}
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
                      >
                        {dispensed && (
                          <motion.svg
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.2 }}
                            viewBox="0 0 24 24" className="w-3 h-3 text-white"
                          >
                            <motion.path
                              fill="none" stroke="currentColor" strokeWidth={3} d="M5 13l4 4L19 7"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.25, delay: 0.1 }}
                            />
                          </motion.svg>
                        )}
                      </motion.div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill className={`w-3.5 h-3.5 shrink-0 ${dispensed ? "text-emerald-500" : "text-sky-500"}`} />
                          <span className={`font-semibold text-sm ${dispensed ? "text-emerald-800" : "text-slate-900"}`}>
                            {item.itemName}
                          </span>
                          {item.strength && <span className="text-[11px] font-mono text-slate-400">{item.strength}</span>}
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">SKU: {item.sku}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span><span className="font-medium text-slate-600">Dosage:</span> {item.dosage}</span>
                        <span><span className="font-medium text-slate-600">Freq:</span> {item.frequency}</span>
                        <span><span className="font-medium text-slate-600">Duration:</span> {item.duration}</span>
                        <span><span className="font-medium text-slate-600">Route:</span> {item.route}</span>
                        <span><span className="font-medium text-slate-600">Qty:</span> {item.qtyPrescribed}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                        <span className="font-mono tabular-nums text-slate-500">Unit: ₦{item.unitPrice.toFixed(2)}</span>
                        {dispensed && <span className="font-mono tabular-nums text-emerald-600 font-semibold">Sub: ₦{(item.qtyDispensed * item.unitPrice).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {anyDispensed && (
          <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                ₦{activePrescription.items.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
              <span className="text-slate-900">Total</span>
              <span className="font-mono tabular-nums text-sky-700">
                ₦{activePrescription.items.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50/30 space-y-3">
        {dispenseError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{dispenseError}</span>
          </div>
        )}
        <Button
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-11 text-sm"
          disabled={prescription.orderStatus === "All Completed" || dispense.isPending}
          onClick={handleDispense}
        >
          {dispense.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Dispensing...</span>
          ) : (
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Dispense & Log</span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PrescriptionDetail;
