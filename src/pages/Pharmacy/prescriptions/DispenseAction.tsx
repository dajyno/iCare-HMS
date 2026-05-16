import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispense } from "../hooks";
import type { PharmacyPrescription } from "../types";

const DispenseAction = ({
  prescription,
  disabled,
  onSuccess,
}: {
  prescription: PharmacyPrescription;
  disabled: boolean;
  onSuccess: () => void;
}) => {
  const dispense = useDispense();
  const [result, setResult] = useState<{
    invoiceNumber: string;
    totalCost: number;
    isPartial: boolean;
  } | null>(null);

  const handleDispense = async () => {
    try {
      const res = await dispense.mutateAsync(prescription);
      setResult({
        invoiceNumber: res.invoiceNumber,
        totalCost: res.totalCost,
        isPartial: res.isPartial,
      });
    } catch {
      // error handled by mutation
    }
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {result.isPartial ? "Partially dispensed" : "Dispensed successfully"}
          </span>
        </div>
        <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-xs text-slate-600">{result.invoiceNumber}</span>
          </div>
          <span className="font-mono tabular-nums font-bold text-sky-700">
            ₦{result.totalCost.toFixed(2)}
          </span>
        </div>
        <Button
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm h-10"
          onClick={onSuccess}
        >
          Back to Queue
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-11 text-sm"
      disabled={disabled || dispense.isPending}
      onClick={handleDispense}
    >
      {dispense.isPending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Dispensing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Dispense & Log
        </span>
      )}
    </Button>
  );
};

export default DispenseAction;
