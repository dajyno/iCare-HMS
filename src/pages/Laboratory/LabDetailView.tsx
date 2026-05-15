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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "./StatusBadge";
import { supabase, toCamel } from "@/src/lib/supabase";

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
  onBack,
}: {
  order: any;
  onBack: () => void;
}) => {
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [interpretations, setInterpretations] = useState<Record<string, string>>({});
  const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({});
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: siblingOrders } = useQuery({
    queryKey: ["batch-orders", order?.consultationId],
    queryFn: async () => {
      if (!order?.consultationId) return [order];
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, patient:patients(*), test:lab_tests(*)")
        .eq("consultation_id", order.consultationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
    enabled: !!order,
  });

  const orders = siblingOrders ?? [order];
  const isCompleted = orders.every((o: any) => o?.status === "Completed");
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
    enabled: isCompleted && orders.length > 0,
  });

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const o of orders) {
        const val = resultValues[o.id] ?? "";
        const unit = units[o.id] ?? "";
        let interp = interpretations[o.id] ?? "";

        if (file && val) {
          const fileTag = `[ATTACHMENT:${file.name}]\n`;
          if (!interp.startsWith("[ATTACHMENT:")) interp = fileTag + interp;
        }

        if (isCompleted && existingResults?.length) {
          const existing = existingResults.find((r: any) => r.requestId === o.id);
          if (existing) {
            await supabase
              .from("lab_results")
              .update({ result_value: val, unit: unit || null, interpretation: interp || null })
              .eq("id", existing.id);
            continue;
          }
        }

        const { error } = await supabase.from("lab_results").insert({
          request_id: o.id,
          patient_id: o.patientId,
          result_value: val,
          unit: unit || null,
          reference_range: o.test?.referenceRange ?? null,
          interpretation: interp || null,
        });
        if (error) throw error;

        await supabase
          .from("lab_requests")
          .update({ status: "Completed" })
          .eq("id", o.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-results"] });
      queryClient.invalidateQueries({ queryKey: ["batch-orders"] });
      queryClient.invalidateQueries({ queryKey: ["lab-result"] });
      onBack();
    },
    onError: (err) => {
      alert("Save failed: " + err.message);
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

  const handleSave = () => {
    saveMutation.mutate();
  };

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
              ? `BATCH-${order?.consultationId?.slice(-4).toUpperCase()}`
              : `REQ-${order.id?.slice(-6).toUpperCase()}`}
          </span>
          <StatusBadge status={mapStatus(order?.status)} />
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && viewMode === "view" && (
            <>
              <Button size="sm" variant="outline" className="h-9 px-4 gap-1.5 text-xs font-semibold" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button size="sm" variant="outline" className="h-9 px-4 gap-1.5 text-xs font-semibold" onClick={() => setViewMode("edit")}>
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Button>
            </>
          )}
          {(!isCompleted || viewMode === "edit") && (
            <Button
              size="sm"
              className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-5 gap-2 font-semibold text-xs"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Saving..." : isCompleted ? "Update Results" : "Save Results"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
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
                    <div className="grid grid-cols-2 gap-4">
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
                  </div>
                ) : (
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={manualFlags[o.id] ?? false} onChange={(e) => setManualFlags((p) => ({ ...p, [o.id]: e.target.checked }))} className="sr-only" />
                          <span className="text-xs font-medium text-slate-600">Flag Abnormal</span>
                        </label>
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
