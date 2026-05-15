import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Edit3, Beaker, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";

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
  const { data: result } = useQuery({
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

          {result ? (
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
                  <p className="text-sm text-slate-700">{result.interpretation}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Requested: {order?.createdAt ? format(new Date(order.createdAt), "MMM dd, yyyy HH:mm") : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Completed: {result?.date ? format(new Date(result.date), "MMM dd, yyyy HH:mm") : "—"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              Loading result...
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-1.5 text-xs font-semibold"
              onClick={() => window.print()}
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
