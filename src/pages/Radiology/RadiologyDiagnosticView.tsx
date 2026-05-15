import { useState } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Edit3,
  Printer,
  Save,
  X,
  Scan,
  Loader2,
  FileText,
  Stethoscope,
  Calendar,
  User,
} from "lucide-react";

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
  request,
  open,
  onClose,
}: {
  request: any;
  open: boolean;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const isCompleted = request?.status === "Completed";
  const [viewMode, setViewMode] = useState<"view" | "edit">(
    isCompleted ? "view" : "edit"
  );
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [printing, setPrinting] = useState(false);

  const { data: existingResult } = useQuery({
    queryKey: ["radiology-result", request?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_results")
        .select("*")
        .eq("request_id", request.id)
        .maybeSingle();
      if (error) throw error;
      return data ? toCamel(data) : null;
    },
    enabled: open && !!request?.id,
  });

  const currentFindings = findings || existingResult?.findings || "";
  const currentConclusion = conclusion || existingResult?.conclusion || "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isCompleted && existingResult) {
        const { error } = await supabase
          .from("radiology_results")
          .update({
            findings: findings || existingResult.findings,
            conclusion: conclusion || existingResult.conclusion,
          })
          .eq("id", existingResult.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("radiology_results").insert({
          request_id: request.id,
          patient_id: request.patientId,
          findings: findings,
          conclusion: conclusion,
        });
        if (error) throw error;

        const { error: updateError } = await supabase
          .from("radiology_requests")
          .update({ status: "Completed" })
          .eq("id", request.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      setViewMode("view");
    },
    onError: (err) => {
      alert("Save failed: " + err.message);
    },
  });

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 800);
  };

  const patientName = request?.patient
    ? `${request.patient.firstName ?? ""} ${request.patient.lastName ?? ""}`.trim()
    : "—";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" showCloseButton={false}>
        <SheetHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-50">
                <Scan className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-slate-900">
                  Diagnostic Report
                </SheetTitle>
                <p className="text-[11px] text-slate-500">
                  {request?.exam?.name ?? "Examination"}
                </p>
              </div>
            </div>
            <SheetClose className="text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Patient Info Bar */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{patientName}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  {request?.patient?.patientId && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {request.patient.patientId}
                    </span>
                  )}
                  {request?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={request?.status} />
            </div>
          </div>

          {/* Findings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Observation / Findings</h3>
            </div>
            <div className="p-5">
              {viewMode === "view" ? (
                <p className="text-base leading-relaxed text-slate-800 font-medium">
                  {currentFindings || "No findings recorded yet."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Findings
                  </Label>
                  <Textarea
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Enter radiological findings / observations..."
                    className="min-h-[140px] text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Conclusion */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Conclusion / Recommendations</h3>
            </div>
            <div className="p-5">
              {viewMode === "view" ? (
                <p className="text-base leading-relaxed text-slate-800 font-medium">
                  {currentConclusion || "No conclusion recorded yet."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Conclusion
                  </Label>
                  <Textarea
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="Enter conclusion and recommendations..."
                    className="min-h-[120px] text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Exam Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Exam Details
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Modality</span>
                <span className="font-medium">{request?.exam?.category?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price</span>
                <span className="font-medium">
                  {request?.exam?.price ? `₦${Number(request.exam.price).toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested</span>
                <span className="font-medium font-mono text-[10px]">
                  {request?.createdAt
                    ? new Date(request.createdAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Toolbar */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-end gap-2">
          {isCompleted && viewMode === "view" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 gap-1.5 text-xs font-semibold"
                disabled={printing}
                onClick={handlePrint}
              >
                {printing ? (
                  <motion.span
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </motion.span>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" />
                    Print PDF
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setFindings(existingResult?.findings ?? "");
                  setConclusion(existingResult?.conclusion ?? "");
                  setViewMode("edit");
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Result
              </Button>
            </>
          )}
          {(!isCompleted || viewMode === "edit") && (
            <>
              {viewMode === "edit" && isCompleted && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-4 text-xs font-semibold text-slate-500"
                  onClick={() => setViewMode("view")}
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-5 gap-2 font-semibold text-xs"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? "Saving..." : isCompleted ? "Update Report" : "Save Report"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RadiologyDiagnosticView;
