import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  FileText,
  Paperclip,
  DollarSign,
  Beaker,
  Printer,
  Edit3,
  CheckCircle2,
  Loader2,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import { supabase, toCamel } from "@/src/lib/supabase";
import { getHospitalName } from "@/src/lib/hospitalConfig";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

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

const LabDetailView = ({
  order,
  batch,
  onBack,
}: {
  order: any;
  batch?: any[] | null;
  onBack: () => void;
}) => {
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [interpretations, setInterpretations] = useState<Record<string, string>>({});

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const resultValuesRef = useRef(resultValues);
  resultValuesRef.current = resultValues;
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const interpretationsRef = useRef(interpretations);
  interpretationsRef.current = interpretations;
  const fileRef = useRef(file);
  fileRef.current = file;
  const { data: siblingOrders } = useQuery({
    queryKey: ["batch-orders", order?.consultationId ?? order?.batchId],
    queryFn: async () => {
      const groupKey = order?.consultationId ?? order?.batchId;
      if (!groupKey) return [order];
      const field = order?.consultationId ? "consultation_id" : "batch_id";
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, patient:patients(*), test:lab_tests(*)")
        .eq(field, groupKey)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!order,
  });

  const orders = siblingOrders ?? [order];
  const isCompleted = orders.every((o: any) => o?.status === "Completed");
  const isPaid = orders.every((o: any) => o?.paymentStatus === "Paid");
  const [viewMode, setViewMode] = useState<"view" | "edit">(
    isCompleted ? "view" : "edit"
  );

  const { data: existingResults } = useQuery({
    queryKey: ["batch-results", order?.id],
    queryFn: async () => {
      const ids = orders.map((o: any) => o.id);
      const { data, error } = await supabase
        .from("lab_results")
        .select("*")
        .in("request_id", ids);
      if (error) throw error;
      return toCamel(data ?? []);
    },
    enabled: orders.length > 0,
  });

  const existingResultsRef = useRef(existingResults);
  existingResultsRef.current = existingResults;

  useEffect(() => {
    if (existingResults && existingResults.length > 0) {
      const values: Record<string, string> = {};
      const unitMap: Record<string, string> = {};
      const interpMap: Record<string, string> = {};
      const flagMap: Record<string, boolean> = {};
      for (const r of existingResults) {
        values[r.requestId] = r.resultValue ?? "";
        unitMap[r.requestId] = r.unit ?? "";
        interpMap[r.requestId] = r.interpretation ?? "";
      }
      setResultValues((prev) => ({ ...prev, ...values }));
      setUnits((prev) => ({ ...prev, ...unitMap }));
      setInterpretations((prev) => ({ ...prev, ...interpMap }));
    }
  }, [existingResults]);

  const saveResults = async (markCompleted: boolean) => {
    const latestResults = resultValuesRef.current;
    const latestUnits = unitsRef.current;
    const latestInterps = interpretationsRef.current;
    const latestFile = fileRef.current;

    for (const o of orders) {
      const val = latestResults[o.id] ?? "";
      const unit = latestUnits[o.id] ?? "";
      let interp = latestInterps[o.id] ?? "";

      if (latestFile && val) {
        const fileTag = `[ATTACHMENT:${latestFile.name}]\n`;
        if (!interp.startsWith("[ATTACHMENT:")) interp = fileTag + interp;
      }

      const upsertPayload: any = {
        request_id: o.id,
        patient_id: o.patientId,
        result_value: val,
        unit: unit || null,
        reference_range: o.test?.referenceRange ?? null,
        interpretation: interp || null,
        edited_by: (user as any)?.full_name ?? null,
        edited_at: new Date().toISOString(),
        tenant_id: (user as any)?.tenantId ?? null,
      };

      const { error } = await supabase
        .from("lab_results")
        .upsert(upsertPayload, { onConflict: "request_id", ignoreDuplicates: false });

      if (error && error.message?.includes("edited_at")) {
        delete upsertPayload.edited_at;
        const { error: retryError } = await supabase
          .from("lab_results")
          .upsert(upsertPayload, { onConflict: "request_id", ignoreDuplicates: false });
        if (retryError) throw retryError;
      } else if (error && error.message?.includes("edited_by")) {
        delete upsertPayload.edited_by;
        const { error: retryError } = await supabase
          .from("lab_results")
          .upsert(upsertPayload, { onConflict: "request_id", ignoreDuplicates: false });
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }

      if (markCompleted) {
        const { error } = await supabase
          .from("lab_requests")
          .update({ status: "Completed" })
          .eq("id", o.id);
        if (error) throw error;
      }
    }
  };

  const saveDraftMutation = useMutation({
    mutationFn: () => saveResults(false),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["batch-results"] });
      await queryClient.invalidateQueries({ queryKey: ["batch-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["lab-result"] });
      toast.success("Results saved successfully.");
      onBack();
    },
    onError: (err) => {
      toast.error("Save draft failed: " + err.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => saveResults(true),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["batch-results"] });
      await queryClient.invalidateQueries({ queryKey: ["batch-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["lab-result"] });
      toast.success("Results completed successfully.");
      onBack();
    },
    onError: (err) => {
      toast.error("Complete failed: " + err.message);
    },
  });

  const hasUncollected = orders.some((o: any) => o?.status === "Requested");

  const markCollectedMutation = useMutation({
    mutationFn: async () => {
      const uncollected = orders.filter((o: any) => o?.status === "Requested");
      for (const o of uncollected) {
        const { error } = await supabase
          .from("lab_requests")
          .update({ status: "SampleCollected" })
          .eq("id", o.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-orders"] });
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    },
    onError: (err) => {
      toast.error("Mark as collected failed: " + err.message);
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === "application/pdf" || f.type.startsWith("image/"))) setFile(f);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);

  const handlePrintAll = useCallback(() => {
    const hospitalName = getHospitalName();
    const batchId = orders.length > 1
      ? `BATCH-${order?.consultationId?.slice(-4).toUpperCase() || order?.batchId?.slice(-4).toUpperCase()}`
      : `REQ-${order.id?.slice(-6).toUpperCase()}`;
    const patientName = order?.patient
      ? `${order.patient.firstName ?? ""} ${order.patient.lastName ?? ""}`.trim()
      : "—";
    const requestedDate = order?.createdAt
      ? format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")
      : "—";

    const testsHtml = orders.map((o: any, idx: number) => {
      const res = existingResults?.find((r: any) => r.requestId === o.id);
      const resultValue = res?.resultValue ?? "—";
      const unit = res?.unit ?? "—";
      const refRange = res?.referenceRange ?? o?.test?.referenceRange ?? null;
      const interp = res?.interpretation
        ? res.interpretation.replace(/^\[ATTACHMENT:.+?\]\n?/, "")
        : null;
      const completedDate = res?.date
        ? format(new Date(res.date), "MMM dd, yyyy HH:mm")
        : "—";

      return `
        <div class="test-section">
          <div class="test-header">${idx + 1}. ${o?.test?.name ?? "Unknown Test"}</div>
          <hr class="thin-divider" />
          <div class="section-label">Result Value</div>
          <div class="section-value">${resultValue}</div>
          <div class="section-label">Unit</div>
          <div class="section-value-plain">${unit}</div>
          ${refRange ? `<div class="section-label">Reference Range</div><div class="section-value-plain">${refRange}</div>` : ""}
          ${interp ? `<div class="section-label">Interpretation</div><div class="section-value-plain">${interp}</div>` : ""}
          <div class="section-label">Completed</div>
          <div class="section-value-plain">${completedDate}</div>
        </div>
      `;
    }).join("<hr class=\"divider\" />");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Results - ${hospitalName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
          .hospital-name { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .title { text-align: center; font-size: 16px; font-weight: 600; color: #005EB8; margin-bottom: 6px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 16px 0; }
          .thin-divider { border: none; border-top: 1px solid #e2e8f0; margin: 8px 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
          .meta-label { color: #64748b; }
          .meta-value { font-weight: 600; }
          .test-section { margin-top: 4px; }
          .test-header { font-size: 15px; font-weight: 700; color: #005EB8; }
          .section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 3px; }
          .section-value { font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; }
          .section-value-plain { font-size: 14px; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          .meta-grid { display: flex; gap: 32px; flex-wrap: wrap; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="hospital-name">${hospitalName}</div>
        <div class="title">Laboratory Results (Batch)</div>
        <hr class="divider" />
        <div class="meta-row"><span class="meta-label">Patient:</span><span class="meta-value">${patientName}</span></div>
        <div class="meta-row"><span class="meta-label">Batch:</span><span class="meta-value">${batchId}</span></div>
        <div class="meta-row"><span class="meta-label">Requested:</span><span class="meta-value">${requestedDate}</span></div>
        <hr class="divider" />
        ${testsHtml}
        <div class="footer">This is a system-generated report from ${hospitalName}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }, [orders, order, existingResults]);

  const totalPrice = orders.reduce(
    (sum: number, o: any) => sum + (o?.test?.price ?? 0),
    0
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-700 -ml-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <span className="font-mono text-xs font-semibold text-slate-500">
              {orders.length > 1
                ? `BATCH-${order?.consultationId?.slice(-4).toUpperCase() || order?.batchId?.slice(-4).toUpperCase()}`
                : `REQ-${order.id?.slice(-6).toUpperCase()}`}
            </span>
            <StatusBadge status={mapStatus(order?.status)} />
          </div>

          <div className="flex items-center gap-2">
            {isCompleted && viewMode === "view" ? (
              <>
                <Button size="sm" variant="outline" className="h-9 px-4 gap-1.5 text-xs font-semibold" onClick={handlePrintAll}>
                  <Printer className="w-3.5 h-3.5" /> Print All
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-4 gap-1.5 text-xs font-semibold" onClick={onBack}>
                  Close
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-4 gap-1.5 text-xs font-semibold" onClick={() => setViewMode("edit")}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
              </>
            ) : (
              <>
                {hasUncollected && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 gap-1.5 text-xs font-semibold border-sky-200 text-sky-700 hover:border-sky-400 hover:bg-sky-50"
                    onClick={() => markCollectedMutation.mutate()}
                    disabled={markCollectedMutation.isPending || !isPaid}
                    title={!isPaid ? "Cannot collect samples until payment is confirmed" : undefined}
                  >
                    <Syringe className="w-3.5 h-3.5" />
                    {markCollectedMutation.isPending ? "Collecting..." : "Mark as Collected"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-4 gap-1.5 text-xs font-semibold"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending || !isPaid}
                  title={!isPaid ? "Cannot save results until payment is confirmed" : undefined}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-5 gap-2 font-semibold text-xs"
                  onClick={() => completeMutation.mutate()}
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
        </div>

      {!isPaid && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">UNPAID — Awaiting Payment</p>
            <p className="text-xs text-amber-700">
              Lab tests cannot be started until payment is confirmed by the billing department.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {orders.map((o: any, idx: number) => {
            const val = resultValues[o.id] ?? "";
            const unit = units[o.id] ?? "";
            const refRange = o?.test?.referenceRange ?? null;

            return (
              <div key={o.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {idx + 1}. {o?.test?.name ?? "Unknown Test"}
                    </h3>
                  </div>
                  {refRange && (
                    <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">
                      Ref: {refRange}
                    </span>
                  )}
                </div>

                {viewMode === "view" && existingResults?.length ? (
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Result</p>
                        <p className="text-lg font-bold font-mono text-slate-900">
                          {existingResults.find((r: any) => r.requestId === o.id)?.resultValue ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit</p>
                        <p className="text-sm text-slate-700">{existingResults.find((r: any) => r.requestId === o.id)?.unit ?? "—"}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Interpretation</p>
                    <p className="text-sm text-slate-700">
                      {existingResults.find((r: any) => r.requestId === o.id)?.interpretation?.replace(/^\[ATTACHMENT:.+?\]\n?/, "") || "—"}
                    </p>
                    {existingResults.find((r: any) => r.requestId === o.id)?.interpretation?.startsWith("[ATTACHMENT:") && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <FileText className="w-3.5 h-3.5 text-[#005EB8]" />
                        <span className="text-[11px] text-slate-700 font-medium">
                          {existingResults.find((r: any) => r.requestId === o.id)?.interpretation?.match(/\[ATTACHMENT:(.+?)\]/)?.[1]}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const r = existingResults?.find((r: any) => r.requestId === o.id);
                      if (r?.editedAt || r?.editedBy) {
                        const editedBy = r.editedBy ?? "Lab Technician";
                        const editedDate = r.editedAt ? format(new Date(r.editedAt), "MMM dd, yyyy HH:mm") : "";
                        return (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                            <Edit3 className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] text-slate-500">
                              Edited by <span className="font-medium text-slate-700">{editedBy}</span>
                              {editedDate && <span> on {editedDate}</span>}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>Requested: {o?.createdAt ? format(new Date(o.createdAt), "MMM dd, yyyy HH:mm") : "—"}</span>
                      <span>Completed: {(() => { const r = existingResults?.find((r: any) => r.requestId === o.id); return r?.date ? format(new Date(r.date), "MMM dd, yyyy HH:mm") : "—"; })()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Result Value</Label>
                        <Input
                          value={val}
                          onChange={(e) => setResultValues((p) => ({ ...p, [o.id]: e.target.value }))}
                          placeholder="Enter value..."
                          className="h-10 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unit</Label>
                        <Input
                          value={unit}
                          onChange={(e) => setUnits((p) => ({ ...p, [o.id]: e.target.value }))}
                          placeholder="e.g. x10^9/L"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Interpretation / Notes</Label>
                      <Textarea
                        value={interpretations[o.id] ?? ""}
                        onChange={(e) => setInterpretations((p) => ({ ...p, [o.id]: e.target.value }))}
                        placeholder="Add interpretation..."
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Invoicing Bridge */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Invoicing Bridge</h3>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="text-left pb-2 font-medium">Item</th>
                    <th className="text-right pb-2 font-medium">Price (₦)</th>
                    <th className="text-right pb-2 font-medium w-16">Qty</th>
                    <th className="text-right pb-2 font-medium">Total (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-slate-50">
                      <td className="py-3 text-sm text-slate-900">{o?.test?.name ?? "Lab Test"}</td>
                      <td className="py-3 text-right font-mono text-sm text-slate-700">{o?.test?.price?.toFixed(2) ?? "0.00"}</td>
                      <td className="py-3 text-right font-mono text-sm text-slate-700">1</td>
                      <td className="py-3 text-right font-mono text-sm font-semibold text-slate-900">{o?.test?.price?.toFixed(2) ?? "0.00"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-4 text-right text-sm font-bold text-slate-900">Total</td>
                    <td className="pt-4 text-right font-mono text-sm font-bold text-slate-900">₦{totalPrice.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - File Attachment */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Lab Report</h3>
            </div>
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} className="p-6">
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
              <div onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${dragOver ? "border-[#005EB8] bg-[#005EB8]/5" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"}`}
              >
                <Paperclip className={`w-8 h-8 mx-auto mb-3 transition-all duration-200 ${dragOver ? "text-[#005EB8] drop-shadow-[0_0_8px_rgba(0,94,184,0.5)]" : "text-slate-300"}`} />
                <p className="text-xs text-slate-500 mb-1">{file ? file.name : "Drop file or click to browse"}</p>
                <p className="text-[10px] text-slate-400">PDF or Image</p>
              </div>
              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Details</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Tests</span>
                <span className="font-medium">{orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Patient</span>
                <span className="font-medium">{order?.patient?.firstName ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested</span>
                <span className="font-medium font-mono text-[10px]">
                  {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabDetailView;
