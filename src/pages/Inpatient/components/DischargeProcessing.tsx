import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  FileText,
  Calculator,
  ArrowRight,
  Loader2,
  Receipt,
  Bed,
  Pill,
  StickyNote,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabase";
import type { ActiveAdmission } from "../inpatientTypes";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const DischargeProcessing = ({
  admission,
  onAuthorizeDischarge,
  onGenerateInvoice,
  onSaveClinicalNotes,
  onInvoicePaid,
  onInvoiceRecovered,
  getBedPrice,
}: {
  admission: ActiveAdmission;
  onAuthorizeDischarge: (summary: string) => void;
  onGenerateInvoice: () => Promise<{ invoiceNumber: string } | null>;
  onSaveClinicalNotes?: (notes: string) => void;
  onInvoicePaid?: (admissionId: string) => void;
  onInvoiceRecovered?: (admissionId: string, invoiceId: string, paid: boolean) => void;
  getBedPrice?: (wardCode: string, bedNo: string) => number;
}) => {
  const [summary, setSummary] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(admission.clinicalNotes || "");
  const [authorizing, setAuthorizing] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showDischargeSuccess, setShowDischargeSuccess] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
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
    const bedRate = getBedPrice
      ? getBedPrice(admission.wardCode, admission.bedNo)
      : 2500;
    const bedStayCost = days * bedRate;
    const medDetails = admission.medicationSchedule.map((m) => {
      const adminCount = m.administrationLog.filter(
        (l) => l.status === "Administered"
      ).length;
      const cost = adminCount * (m.unitPrice || 150);
      return { name: m.name, adminCount, unitPrice: m.unitPrice || 150, cost };
    });
    const medCost = medDetails.reduce((sum, d) => sum + d.cost, 0);
    return { days, bedRate, bedStayCost, medDetails, medCost, total: bedStayCost + medCost };
  }, [admission, getBedPrice]);

  // Recover invoice ID if it was lost from state
  useEffect(() => {
    if (admission.dischargeInvoiceId || admission.careStatus === "Discharged") return;

    let cancelled = false;
    const recoverInvoice = async () => {
      const patientId = admission.patient.patientId;
      if (!patientId) return;

      // Check Supabase for unpaid Inpatient invoices for this patient
      const { data: supaInvoices } = await (supabase as any)
        .from("invoices")
        .select("id, status")
        .eq("patient_id", patientId)
        .eq("source_type", "Inpatient")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cancelled && supaInvoices?.[0]) {
        const inv = supaInvoices[0];
        onInvoiceRecovered?.(admission.admissionId, inv.id, inv.status === "Paid");
        return;
      }

      // Check localStorage fallback
      try {
        const raw = localStorage.getItem("icare_billing_local");
        if (raw) {
          const localInvoices = JSON.parse(raw);
          const match = localInvoices.find(
            (inv: any) =>
              inv.patientId === patientId &&
              inv.sourceType === "Inpatient"
          );
          if (!cancelled && match) {
            onInvoiceRecovered?.(admission.admissionId, match.id, match.status === "Paid");
          }
        }
      } catch { /* ignore */ }
    };

    recoverInvoice();
  }, [admission.dischargeInvoiceId, admission.careStatus, admission.admissionId, admission.patient.patientId, onInvoiceRecovered]);

  // Check invoice payment status (both Supabase and localStorage)
  useEffect(() => {
    if (!admission.dischargeInvoiceId || admission.dischargeInvoicePaid || admission.careStatus === "Discharged") return;

    let cancelled = false;
    const checkPayment = async () => {
      // Check Supabase
      const { data } = await (supabase as any)
        .from("invoices")
        .select("status")
        .eq("id", admission.dischargeInvoiceId)
        .single() as { data: { status: string } | null };
      if (!cancelled && data?.status === "Paid") {
        onInvoicePaid?.(admission.admissionId);
        return;
      }

      // Check localStorage fallback from billing module
      try {
        const raw = localStorage.getItem("icare_billing_local");
        if (raw) {
          const localInvoices = JSON.parse(raw);
          const match = localInvoices.find(
            (inv: any) => inv.id === admission.dischargeInvoiceId
          );
          if (!cancelled && match?.status === "Paid") {
            onInvoicePaid?.(admission.admissionId);
          }
        }
      } catch { /* ignore */ }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [admission.dischargeInvoiceId, admission.dischargeInvoicePaid, admission.careStatus, admission.admissionId, onInvoicePaid]);

  const invoicePaid = admission.dischargeInvoicePaid === true;
  const hasInvoice = !!admission.dischargeInvoiceId;

  const handleSaveClinicalNotes = () => {
    if (onSaveClinicalNotes) {
      onSaveClinicalNotes(clinicalNotes);
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === "notes" ? { ...item, checked: true } : item
        )
      );
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    const result = await onGenerateInvoice();
    setGeneratingInvoice(false);
    if (result) {
      setLastInvoiceNumber(result.invoiceNumber);
      setShowInvoiceDialog(true);
    }
  };

  const handleAuthorize = async () => {
    if (!allChecked || !summary.trim()) return;
    setAuthorizing(true);
    await onAuthorizeDischarge(summary);
    setAuthorizing(false);
    setShowDischargeSuccess(true);
  };

  let dischargeDisabledReason = "";
  if (!allChecked) dischargeDisabledReason = "Complete all checklist items";
  else if (!summary.trim()) dischargeDisabledReason = "Write a discharge summary";
  else if (!hasInvoice) dischargeDisabledReason = "Generate an invoice first";
  else if (!invoicePaid) dischargeDisabledReason = "Invoice not yet paid — direct patient to billing counter";
  const dischargeDisabled = !!dischargeDisabledReason || authorizing || admission.careStatus === "Discharged";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Invoice Generated Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={(o) => { if (!o) setShowInvoiceDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <DialogTitle>Invoice Generated</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 space-y-2 pt-2">
              <p>
                Invoice <span className="font-bold text-slate-900">#{lastInvoiceNumber}</span> has been created successfully.
              </p>
              <p>
                Please direct the patient to the billing counter to complete payment. The discharge can only proceed after the invoice is paid.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Discharge Success Dialog */}
      <Dialog open={showDischargeSuccess} onOpenChange={(o) => { if (!o) setShowDischargeSuccess(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-sky-600" />
              </div>
              <DialogTitle>Discharge Complete</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 space-y-2 pt-2">
              <p>
                Patient <span className="font-semibold text-slate-900">{admission.patient.name}</span> has been successfully discharged.
              </p>
              <p>
                Bed <span className="font-semibold text-slate-900">{admission.bedNo}</span> in {admission.wardCode} is now available.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

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
          <StickyNote className="w-4 h-4 text-violet-600" />
          Clinical Discharge Notes
        </h3>
        <Textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Write clinical observations, treatment response, and discharge instructions..."
          rows={4}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveClinicalNotes}
            disabled={clinicalNotes === (admission.clinicalNotes || "")}
            className="gap-1.5 text-xs"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Save Clinical Notes
          </Button>
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
                Bed Stay ({billingBreakdown.days} days × ₦{billingBreakdown.bedRate})
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-slate-900">
              ₦{billingBreakdown.bedStayCost.toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Pill className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-sm font-semibold text-slate-700">Medications</span>
            </div>
            {billingBreakdown.medDetails.length === 0 ? (
              <div className="text-sm text-slate-500 italic">No medications scheduled</div>
            ) : (
              billingBreakdown.medDetails.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {d.name} ({d.adminCount} × ₦{d.unitPrice})
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    ₦{d.cost.toLocaleString()}
                  </span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between text-sm pt-1 border-t border-sky-200">
              <span className="font-semibold text-slate-700">Medications Total</span>
              <span className="font-mono font-bold text-slate-900">
                ₦{billingBreakdown.medCost.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-100 border border-slate-200 mt-2">
            <span className="text-sm font-bold text-slate-800">Total Due</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              ₦{billingBreakdown.total.toLocaleString()}
            </span>
          </div>

          {billingBreakdown.total > 0 && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice || hasInvoice || admission.careStatus === "Discharged"}
                className={cn(
                  "w-full gap-1.5 text-xs font-semibold",
                  hasInvoice
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {generatingInvoice ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Invoice...</>
                ) : hasInvoice ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Invoice Generated</>
                ) : (
                  <><CreditCard className="w-3.5 h-3.5" /> Generate Invoice</>
                )}
              </Button>
            </div>
          )}
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

      <div className="flex flex-col items-end gap-2">
        {dischargeDisabledReason && admission.careStatus !== "Discharged" && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            {dischargeDisabledReason}
          </p>
        )}
        <Button
          size="lg"
          disabled={dischargeDisabled}
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
          ) : admission.careStatus === "Discharged" ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Already Discharged
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
