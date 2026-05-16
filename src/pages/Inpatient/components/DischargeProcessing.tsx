import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  FileText,
  Calculator,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Receipt,
  Bed,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActiveAdmission } from "../inpatientTypes";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const DischargeProcessing = ({
  admission,
  onAuthorizeDischarge,
}: {
  admission: ActiveAdmission;
  onAuthorizeDischarge: (summary: string) => void;
}) => {
  const [summary, setSummary] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "chart", label: "Medical chart reconciled", checked: true },
    { id: "labs", label: "All laboratory results reviewed", checked: true },
    { id: "meds", label: "Medication course completed", checked: true },
    { id: "notes", label: "Clinical discharge notes prepared", checked: false },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allChecked = checklist.every((c) => c.checked);

  const billingBreakdown = useMemo(() => {
    const days = admission.daysAdmitted;
    const bedRate = 2500;
    const bedStayCost = days * bedRate;
    const medItems = admission.medicationSchedule.reduce((sum, m) => {
      const adminCount = m.administrationLog.filter(
        (l) => l.status === "Administered"
      ).length;
      return sum + adminCount;
    }, 0);
    const medCost = medItems * 150;
    return { days, bedRate, bedStayCost, medItems, medCost, total: bedStayCost + medCost };
  }, [admission]);

  const handleAuthorize = async () => {
    if (!allChecked || !summary.trim()) return;
    setAuthorizing(true);
    await onAuthorizeDischarge(summary);
    setAuthorizing(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Discharge Validation Checklist
        </h3>
        <div className="space-y-2">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleChecklist(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              {item.checked ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  item.checked ? "text-slate-600" : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sky-600" />
          Billing Summary
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-sky-50">
            <div className="flex items-center gap-2">
              <Bed className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-sm text-slate-700">
                Bed Stay ({billingBreakdown.days} days × KES {billingBreakdown.bedRate})
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-slate-900">
              KES {billingBreakdown.bedStayCost.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-sky-50">
            <div className="flex items-center gap-2">
              <Pill className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-sm text-slate-700">
                Medications ({billingBreakdown.medItems} admin × KES 150)
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-slate-900">
              KES {billingBreakdown.medCost.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-100 border border-slate-200 mt-2">
            <span className="text-sm font-bold text-slate-800">Total Due</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              KES {billingBreakdown.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          Discharge Summary
        </h3>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Write a comprehensive discharge summary including diagnosis, treatment course, and follow-up instructions..."
          rows={5}
          className="text-sm"
        />
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!allChecked || !summary.trim() || authorizing}
          onClick={handleAuthorize}
          className={cn(
            "gap-2 px-8 text-sm font-bold",
            "bg-sky-600 hover:bg-sky-700"
          )}
        >
          {authorizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Discharge...
            </>
          ) : (
            <>
              <Receipt className="w-4 h-4" />
              Authorize Discharge
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DischargeProcessing;
