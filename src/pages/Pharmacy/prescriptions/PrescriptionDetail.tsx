import { motion } from "motion/react";
import { Pill, Calendar, User, Hash } from "lucide-react";
import { format } from "date-fns";
import PrescriptionBadge from "./PrescriptionBadge";
import DispenseAction from "./DispenseAction";
import type { PharmacyPrescription } from "../types";

const PrescriptionDetail = ({
  prescription,
  onClose,
  onItemToggle,
}: {
  prescription: PharmacyPrescription;
  onClose: () => void;
  onItemToggle: (index: number) => void;
}) => {
  const allDispensed = prescription.items.every((i) => i.qtyDispensed > 0);
  const anyDispensed = prescription.items.some((i) => i.qtyDispensed > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
            {prescription.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{prescription.patientName}</h2>
            <p className="text-[11px] text-slate-500 font-mono">{prescription.patientCode}</p>
          </div>
        </div>
        <PrescriptionBadge status={prescription.orderStatus} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-xs">{prescription.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">{prescription.prescribedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">{format(new Date(prescription.prescriptionDate), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">{prescription.patientDob ? format(new Date(prescription.patientDob), "MMM dd, yyyy") : "—"}</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Medications</h3>
          <div className="space-y-2">
            {prescription.items.map((item, i) => {
              const dispensed = item.qtyDispensed > 0;
              return (
                <motion.div
                  key={i}
                  layout
                  className={`rounded-xl border p-3.5 transition-all ${
                    dispensed
                      ? "border-emerald-200/60 bg-emerald-50/40"
                      : "border-slate-200/60 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <motion.button
                      onClick={() => onItemToggle(i)}
                      className="mt-0.5 shrink-0"
                      whileTap={{ scale: 0.9 }}
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
                            viewBox="0 0 24 24"
                            className="w-3 h-3 text-white"
                          >
                            <motion.path
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.25, delay: 0.1 }}
                            />
                          </motion.svg>
                        )}
                      </motion.div>
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill className={`w-3.5 h-3.5 shrink-0 ${dispensed ? "text-emerald-500" : "text-sky-500"}`} />
                          <span className={`font-semibold text-sm ${dispensed ? "text-emerald-800" : "text-slate-900"}`}>
                            {item.itemName}
                          </span>
                          {item.strength && (
                            <span className="text-[11px] font-mono text-slate-400">{item.strength}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span><span className="font-medium text-slate-600">Dosage:</span> {item.dosage}</span>
                        <span><span className="font-medium text-slate-600">Freq:</span> {item.frequency}</span>
                        <span><span className="font-medium text-slate-600">Duration:</span> {item.duration}</span>
                        <span><span className="font-medium text-slate-600">Route:</span> {item.route}</span>
                        <span><span className="font-medium text-slate-600">Qty:</span> {item.qtyPrescribed}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                        <span className="font-mono tabular-nums text-slate-500">
                          Unit: ₦{item.unitPrice.toFixed(2)}
                        </span>
                        {dispensed && (
                          <span className="font-mono tabular-nums text-emerald-600 font-semibold">
                            Sub: ₦{(item.qtyDispensed * item.unitPrice).toFixed(2)}
                          </span>
                        )}
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
                ₦{prescription.items.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT (7.5%)</span>
              <span className="font-mono tabular-nums text-slate-600">
                ₦{(prescription.items.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0) * 0.075).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
              <span className="text-slate-900">Total</span>
              <span className="font-mono tabular-nums text-sky-700">
                ₦{(prescription.items.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0) * 1.075).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/30">
        <DispenseAction
          prescription={prescription}
          disabled={prescription.orderStatus === "All Completed" || !anyDispensed}
          onSuccess={onClose}
        />
      </div>
    </div>
  );
};

export default PrescriptionDetail;
