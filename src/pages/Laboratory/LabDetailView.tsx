import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  FileText,
  Paperclip,
  DollarSign,
  Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/src/lib/supabase";

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

const parseRange = (
  range: string | null | undefined
): { min: number | null; max: number | null; type: "numeric" | "text" } => {
  if (!range) return { min: null, max: null, type: "text" };
  const trimmed = range.trim();
  const match = trimmed.match(/^([\d.]+)\s*[-–]\s*([\d.]+)$/);
  if (match) {
    return {
      min: parseFloat(match[1]),
      max: parseFloat(match[2]),
      type: "numeric",
    };
  }
  return { min: null, max: null, type: "text" };
};

const useFlagDetection = (value: string, referenceRange: string | null) => {
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    const { min, max, type } = parseRange(referenceRange);
    if (type !== "numeric" || min === null || max === null) {
      setFlagged(false);
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && (num < min || num > max)) {
      setFlagged(true);
    } else {
      setFlagged(false);
    }
  }, [value, referenceRange]);

  return flagged;
};

const LabDetailView = ({
  order,
  onBack,
  emrId: _emrId,
  doctorId: _doctorId,
}: {
  order: any;
  onBack: () => void;
  emrId?: string;
  doctorId?: string;
}) => {
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState(order?.test?.sampleType === "Blood" ? "x10^9/L" : "");
  const [interpretation, setInterpretation] = useState("");
  const [manualFlag, setManualFlag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const referenceRange = order?.test?.referenceRange ?? null;
  const autoFlagged = useFlagDetection(resultValue, referenceRange);
  const isFlagged = manualFlag || autoFlagged;

  const { min, max } = parseRange(referenceRange);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lab_results").insert({
        request_id: order.id,
        patient_id: order.patientId,
        result_value: resultValue,
        unit: unit || null,
        reference_range: referenceRange,
        interpretation: interpretation || null,
        technician_id: _doctorId || null,
      });
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("lab_requests")
        .update({ status: "Completed" })
        .eq("id", order.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
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
            {`REQ-${order.id?.slice(-6).toUpperCase()}`}
          </span>
          <StatusBadge status={mapStatus(order.status)} />
        </div>
        <Button
          size="sm"
          className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-5 gap-2 font-semibold text-xs"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? "Saving..." : "Save Results"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  {order?.test?.name ?? "Analysis Entry"}
                </h3>
              </div>
              {referenceRange && (
                <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">
                  Ref: {referenceRange} {unit}
                </span>
              )}
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Result Value
                  </Label>
                  <Input
                    value={resultValue}
                    onChange={(e) => setResultValue(e.target.value)}
                    placeholder="Enter value..."
                    className="h-10 text-sm font-mono"
                  />
                  {autoFlagged && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-red-500 flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Out of range ({min}–{max})
                    </motion.p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Unit
                  </Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. x10^9/L"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFlagged}
                      onChange={(e) => setManualFlag(e.target.checked)}
                      className="sr-only"
                    />
                    <motion.div
                      animate={
                        isFlagged
                          ? {
                              boxShadow: [
                                "0 0 0 0 rgba(239,68,68,0)",
                                "0 0 12px 2px rgba(239,68,68,0.5)",
                                "0 0 0 0 rgba(239,68,68,0)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 1, repeat: isFlagged ? Infinity : 0 }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isFlagged
                          ? "bg-red-500 border-red-500"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isFlagged && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </motion.svg>
                      )}
                    </motion.div>
                    <span className="text-xs font-medium text-slate-600">
                      Flag Abnormal
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Interpretation / Notes
                </Label>
                <Textarea
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="Add clinical interpretation or notes..."
                  className="min-h-[80px] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Invoicing Bridge */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Invoicing Bridge
              </h3>
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
                  <tr className="border-b border-slate-50">
                    <td className="py-3 text-sm text-slate-900">
                      {order?.test?.name ?? "Lab Test"}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-slate-700">
                      {order?.test?.price?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-slate-700">
                      1
                    </td>
                    <td className="py-3 text-right font-mono text-sm font-semibold text-slate-900">
                      {order?.test?.price?.toFixed(2) ?? "0.00"}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-4 text-right text-sm font-bold text-slate-900">
                      Total
                    </td>
                    <td className="pt-4 text-right font-mono text-sm font-bold text-slate-900">
                      ₦{order?.test?.price?.toFixed(2) ?? "0.00"}
                    </td>
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
              <h3 className="text-sm font-bold text-slate-900">
                Lab Report
              </h3>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="p-6"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                  dragOver
                    ? "border-[#005EB8] bg-[#005EB8]/5"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <Paperclip
                  className={`w-8 h-8 mx-auto mb-3 transition-all duration-200 ${
                    dragOver
                      ? "text-[#005EB8] drop-shadow-[0_0_8px_rgba(0,94,184,0.5)]"
                      : "text-slate-300"
                  }`}
                />
                <p className="text-xs text-slate-500 mb-1">
                  {file ? file.name : "Drop file or click to browse"}
                </p>
                <p className="text-[10px] text-slate-400">PDF or Image</p>
              </div>

              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
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
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Order Details
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Sample</span>
                <span className="font-medium">
                  {order?.test?.sampleType ?? "Blood"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="font-medium">
                  {order?.test?.category ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested</span>
                <span className="font-medium font-mono text-[10px]">
                  {order?.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "—"}
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
