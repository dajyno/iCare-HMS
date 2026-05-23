import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { DrillDownRecord, DrillDownColumn } from "../types";

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  records: DrillDownRecord[];
  columns: DrillDownColumn[];
  loading?: boolean;
}

function formatCellValue(value: unknown, format?: DrillDownColumn["format"]): string {
  if (value === null || value === undefined) return "—";
  if (format === "percentage") return `${value}%`;
  if (format === "number") return Number(value).toLocaleString();
  if (format === "currency") return `₦${Number(value).toLocaleString()}`;
  return String(value);
}

function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("completed") || s.includes("on duty") || s.includes("checked in")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("waiting") || s.includes("break") || s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("in consultation") || s.includes("in surgery") || s.includes("occupied")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (s.includes("cancelled") || s.includes("maintenance")) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function DrillDownModal({ open, onClose, title, records, columns, loading }: DrillDownModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="p-6 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading records...</p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-slate-400">No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        title={col.tooltip}
                        className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, idx) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      {columns.map((col) => {
                        const val = record[col.key];
                        return (
                          <td key={col.key} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                            {col.format === "status" ? (
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] font-medium px-2 py-0.5", getStatusBadgeClass(String(val)))}
                              >
                                {String(val)}
                              </Badge>
                            ) : (
                              <span className="tabular-nums">{formatCellValue(val, col.format)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
