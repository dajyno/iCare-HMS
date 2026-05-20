import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Edit3, Beaker, CalendarClock, FileText } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import { getHospitalName } from "@/src/lib/hospitalConfig";

const mapStatus = (dbStatus: string) => {
  const map: Record<string, string> = {
    Requested: "To Do",
    SampleCollected: "In Progress",
    InProgress: "In Progress",
    AwaitingValidation: "Waiting for Results",
    Completed: "Done",
    Cancelled: "Failed",
  };
  return map[dbStatus] ?? dbStatus;
};

const LabResultDialog = ({
  order,
  open,
  onClose,
  onEdit,
}: {
  order: any;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const { data: result, isLoading: resultLoading } = useQuery({
    queryKey: ["lab-result", order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*")
        .eq("request_id", order.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handlePrint = useCallback(() => {
    if (!order || !result) return;
    const hospitalName = getHospitalName();
    const orderId = `REQ-${order.id?.slice(-6)?.toUpperCase() ?? "—"}`;
    const patientName = order?.patient
      ? `${order.patient.firstName ?? ""} ${order.patient.lastName ?? ""}`.trim()
      : "—";
    const testName = order?.test?.name ?? "Lab Test";
    const resultValue = result.result_value ?? "—";
    const unit = result.unit ?? "—";
    const refRange = result.reference_range ?? null;
    const interpretation = result.interpretation
      ? result.interpretation.replace(/^\[ATTACHMENT:.+?\]\n?/, "")
      : null;
    const requestedDate = order?.createdAt
      ? format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")
      : "—";
    const completedDate = result?.date
      ? format(new Date(result.date), "MMM dd, yyyy HH:mm")
      : "—";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Result - ${hospitalName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
          .hospital-name { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .title { text-align: center; font-size: 16px; font-weight: 600; color: #005EB8; margin-bottom: 6px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 16px 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
          .meta-label { color: #64748b; }
          .meta-value { font-weight: 600; }
          .section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 14px; margin-bottom: 4px; }
          .section-value { font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; }
          .section-value-plain { font-size: 14px; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          .meta-grid { display: flex; gap: 32px; flex-wrap: wrap; }
          .meta-grid .col { flex: 1; min-width: 120px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="hospital-name">${hospitalName}</div>
        <div class="title">Laboratory Result</div>
        <hr class="divider" />
        <div class="meta-row"><span class="meta-label">Order:</span><span class="meta-value">${orderId}</span></div>
        <div class="meta-row"><span class="meta-label">Test:</span><span class="meta-value">${testName}</span></div>
        <div class="meta-row"><span class="meta-label">Patient:</span><span class="meta-value">${patientName}</span></div>
        <hr class="divider" />
        <div class="section-label">Result Value</div>
        <div class="section-value">${resultValue}</div>
        <div class="section-label">Unit</div>
        <div class="section-value-plain">${unit}</div>
        ${refRange ? `<div class="section-label">Reference Range</div><div class="section-value-plain">${refRange}</div>` : ""}
        ${interpretation ? `<div class="section-label">Interpretation</div><div class="section-value-plain">${interpretation}</div>` : ""}
        <hr class="divider" />
        <div class="meta-grid">
          <div class="col"><div class="meta-label">Requested</div><div class="meta-value" style="font-size:13px">${requestedDate}</div></div>
          <div class="col"><div class="meta-label">Completed</div><div class="meta-value" style="font-size:13px">${completedDate}</div></div>
        </div>
        <div class="footer">This is a system-generated report from ${hospitalName}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }, [order, result]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Result — {order?.test?.name ?? "Lab Test"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold text-slate-500">
                {`REQ-${order?.id?.slice(-6)?.toUpperCase() ?? "—"}`}
              </span>
              <StatusBadge status={mapStatus(order?.status)} />
            </div>
          </div>

          {resultLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Loading result...
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Result Value
                  </p>
                  <p className="text-lg font-bold font-mono text-slate-900">
                    {result.result_value ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Unit
                  </p>
                  <p className="text-sm text-slate-700">{result.unit ?? "—"}</p>
                </div>
              </div>

              {result.reference_range && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Reference Range
                  </p>
                  <p className="text-sm text-slate-700">{result.reference_range}</p>
                </div>
              )}

              {result.interpretation && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Interpretation
                  </p>
                  <p className="text-sm text-slate-700">
                    {result.interpretation.replace(/^\[ATTACHMENT:.+?\]\n?/, "") || "—"}
                  </p>
                </div>
              )}

              {result.interpretation?.startsWith("[ATTACHMENT:") && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText className="w-4 h-4 text-[#005EB8]" />
                  <span className="text-xs text-slate-700 font-medium">
                    {result.interpretation.match(/\[ATTACHMENT:(.+?)\]/)?.[1] ?? "Attached file"}
                  </span>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Requested: {order?.createdAt ? format(new Date(order.createdAt), "MMM dd, yyyy HH:mm") : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Completed: {result?.date ? format(new Date(result.date), "MMM dd, yyyy HH:mm") : "—"}</span>
                </div>
                {(result as any)?.editedAt || (result as any)?.editedBy ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edited by <span className="font-medium text-slate-700">{(result as any)?.editedBy ?? "Lab Technician"}</span>{(result as any)?.editedAt && <span> on {format(new Date((result as any).editedAt), "MMM dd, yyyy HH:mm")}</span>}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              No results recorded yet. Click Edit to add results.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-1.5 text-xs font-semibold"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            <Button
              size="sm"
              className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-4 gap-1.5 text-xs font-semibold"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LabResultDialog;
