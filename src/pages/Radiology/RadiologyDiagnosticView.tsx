import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Save,
  Scan,
  Loader2,
  FileText,
  Stethoscope,
  Calendar,
  User,
  CheckCircle2,
  DollarSign,
  Printer,
} from "lucide-react";
import { getHospitalName } from "@/src/lib/hospitalConfig";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  Requested: { label: "Requested", bg: "bg-purple-50", text: "text-purple-700" },
  InProgress: { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700" },
  Completed: { label: "Completed", bg: "bg-blue-50", text: "text-blue-700" },
  Cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-700" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? statusConfig.Requested;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
      {cfg.label}
    </span>
  );
};

const RadiologyDiagnosticView = ({
  requests,
  open,
  onClose,
}: {
  requests: any[];
  open: boolean;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const allCompleted = requests.every((r: any) => r.status === "Completed");
  const isPaid = requests.every((r: any) => r.paymentStatus === "Paid");

  const [findingsMap, setFindingsMap] = useState<Record<string, string>>({});
  const [conclusionMap, setConclusionMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setFindingsMap({});
      setConclusionMap({});
    }
  }, [open]);

  const { data: existingResults } = useQuery({
    queryKey: ["radiology-results-batch", requests.map((r: any) => r.id).sort().join(",")],
    queryFn: async () => {
      const ids = requests.map((r: any) => r.id);
      const { data, error } = await supabase
        .from("radiology_results")
        .select("*")
        .in("request_id", ids);
      if (error) throw error;
      const mapped = (toCamel(data) as any[]).reduce((acc: Record<string, any>, r: any) => {
        acc[r.requestId] = r;
        return acc;
      }, {});
      return mapped;
    },
    enabled: open && requests.length > 0,
  });

  useEffect(() => {
    if (existingResults && open) {
      setFindingsMap((prev) => {
        const next = { ...prev };
        for (const req of requests) {
          const existing = existingResults[req.id];
          if (existing?.findings) next[req.id] = existing.findings;
        }
        return next;
      });
      setConclusionMap((prev) => {
        const next = { ...prev };
        for (const req of requests) {
          const existing = existingResults[req.id];
          if (existing?.conclusion) next[req.id] = existing.conclusion;
        }
        return next;
      });
    }
  }, [existingResults, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const req of requests) {
        const findings = findingsMap[req.id]?.trim() ?? "";
        const conclusion = conclusionMap[req.id]?.trim() ?? "";
        const existing = existingResults?.[req.id];

        if (existing) {
          const { error } = await supabase
            .from("radiology_results")
            .update({ findings, conclusion })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("radiology_results").insert({
            request_id: req.id,
            patient_id: req.patientId,
            findings,
            conclusion,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-results-batch"] });
      onClose();
    },
    onError: (err) => {
      alert("Save failed: " + err.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      for (const req of requests) {
        const findings = findingsMap[req.id]?.trim() ?? "";
        const conclusion = conclusionMap[req.id]?.trim() ?? "";
        const existing = existingResults?.[req.id];

        if (existing) {
          const { error } = await supabase
            .from("radiology_results")
            .update({ findings, conclusion })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("radiology_results").insert({
            request_id: req.id,
            patient_id: req.patientId,
            findings,
            conclusion,
          });
          if (error) throw error;
        }
        const { error: updateError } = await supabase
          .from("radiology_requests")
          .update({ status: "Completed" })
          .eq("id", req.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-results-batch"] });
      onClose();
    },
    onError: (err) => {
      alert("Complete failed: " + err.message);
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const handleComplete = useCallback(() => {
    completeMutation.mutate();
  }, [completeMutation]);

  const handlePrint = useCallback(() => {
    if (!requests.length) return;
    const hospitalName = getHospitalName();
    const firstReq = requests[0];
    const patientName = firstReq?.patient
      ? `${firstReq.patient.firstName ?? ""} ${firstReq.patient.lastName ?? ""}`.trim()
      : "—";
    const patientId = firstReq?.patient?.patientId ?? "—";
    const requestedDate = firstReq?.createdAt
      ? format(new Date(firstReq.createdAt), "MMM dd, yyyy HH:mm")
      : "—";

    const examsHtml = requests.map((req: any, idx: number) => {
      const existing = existingResults?.[req.id];
      const findings = existing?.findings?.trim() || "No findings recorded.";
      const conclusion = existing?.conclusion?.trim() || "No conclusion recorded.";

      return `
        <div class="exam-section">
          <div class="exam-header">${idx + 1}. ${req.exam?.name ?? "Examination"}</div>
          <hr class="thin-divider" />
          <div class="section-label">Observation / Findings</div>
          <div class="section-value-plain">${findings}</div>
          <div class="section-label">Conclusion / Recommendations</div>
          <div class="section-value-plain">${conclusion}</div>
        </div>
      `;
    }).join("<hr class=\"divider\" />");

    const total = requests.reduce((sum: number, req: any) => sum + Number(req.exam?.price ?? 0), 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Radiology Report - ${hospitalName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
          .hospital-name { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .title { text-align: center; font-size: 16px; font-weight: 600; color: #005EB8; margin-bottom: 6px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 16px 0; }
          .thin-divider { border: none; border-top: 1px solid #e2e8f0; margin: 8px 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
          .meta-label { color: #64748b; }
          .meta-value { font-weight: 600; }
          .exam-section { margin-top: 4px; }
          .exam-header { font-size: 15px; font-weight: 700; color: #005EB8; }
          .section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 3px; }
          .section-value-plain { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          .amount { font-size: 15px; font-weight: 700; font-family: 'Courier New', monospace; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="hospital-name">${hospitalName}</div>
        <div class="title">Radiology Report</div>
        <hr class="divider" />
        <div class="meta-row"><span class="meta-label">Patient:</span><span class="meta-value">${patientName}</span></div>
        <div class="meta-row"><span class="meta-label">Patient ID:</span><span class="meta-value">${patientId}</span></div>
        <div class="meta-row"><span class="meta-label">Requested:</span><span class="meta-value">${requestedDate}</span></div>
        <div class="meta-row"><span class="meta-label">Total Examinations:</span><span class="meta-value">${requests.length}</span></div>
        <hr class="divider" />
        ${examsHtml}
        <hr class="divider" />
        <div style="text-align:right; font-size:14px; margin-top:8px;">
          <span class="meta-label">Total:</span> <span class="amount">₦${total.toFixed(2)}</span>
        </div>
        <div class="footer">This is a system-generated report from ${hospitalName}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }, [requests, existingResults]);

  const first = requests[0];
  const patientName = first?.patient
    ? `${first.patient.firstName ?? ""} ${first.patient.lastName ?? ""}`.trim()
    : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-50">
                <Scan className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Diagnostic Report
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  {requests.length} examination{requests.length !== 1 ? "s" : ""} in this order
                </DialogDescription>
              </div>
            </div>

          </div>
        </DialogHeader>

        {/* Patient Info Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{patientName}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                {first?.patient?.patientId && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {first.patient.patientId}
                  </span>
                )}
                {first?.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(first.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per-Exam Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {requests.map((req: any, idx: number) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{req.exam?.name ?? "Examination"}</h3>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Observation / Findings
                  </Label>
                  {allCompleted ? (
                    <p className="text-base leading-relaxed text-slate-800 font-medium">
                      {findingsMap[req.id] || "No findings recorded."}
                    </p>
                  ) : (
                    <Textarea
                      value={findingsMap[req.id] ?? ""}
                      onChange={(e) =>
                        setFindingsMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Enter radiological findings / observations..."
                      className="min-h-[100px] text-sm leading-relaxed"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Conclusion / Recommendations
                  </Label>
                  {allCompleted ? (
                    <p className="text-base leading-relaxed text-slate-800 font-medium">
                      {conclusionMap[req.id] || "No conclusion recorded."}
                    </p>
                  ) : (
                    <Textarea
                      value={conclusionMap[req.id] ?? ""}
                      onChange={(e) =>
                        setConclusionMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Enter conclusion and recommendations..."
                      className="min-h-[100px] text-sm leading-relaxed"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="text-left pb-2 font-medium">Examination</th>
                <th className="text-right pb-2 font-medium">Price (₦)</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req: any) => (
                <tr key={req.id} className="border-b border-slate-50">
                  <td className="py-2 text-sm text-slate-900">{req.exam?.name ?? "—"}</td>
                  <td className="py-2 text-right font-mono text-sm text-slate-700">
                    ₦{Number(req.exam?.price ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-3 text-right text-sm font-bold text-slate-900">
                  Total
                </td>
                <td className="pt-3 text-right font-mono text-sm font-bold text-slate-900">
                  ₦{requests.reduce((sum: number, req: any) => sum + Number(req.exam?.price ?? 0), 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Unpaid Banner */}
        {!isPaid && (
          <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-6 py-3 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
              <span className="text-amber-700 text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">UNPAID — Awaiting Payment</p>
              <p className="text-xs text-amber-700">
                Examination cannot be completed until payment is confirmed by the billing department.
              </p>
            </div>
          </div>
        )}

        {/* Footer Toolbar */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-end gap-2">
          {allCompleted ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 gap-1.5 text-xs font-semibold"
                onClick={handlePrint}
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 text-xs font-semibold"
                onClick={onClose}
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 gap-1.5 text-xs font-semibold"
                onClick={handleSave}
                disabled={saveMutation.isPending || !isPaid}
                title={!isPaid ? "Cannot save results until payment is confirmed" : undefined}
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-5 gap-2 font-semibold text-xs"
                onClick={handleComplete}
                disabled={completeMutation.isPending || !isPaid}
                title={!isPaid ? "Cannot complete until payment is confirmed" : undefined}
              >
                {completeMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete All
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RadiologyDiagnosticView;
