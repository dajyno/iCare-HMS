import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReferralDetailItem } from "./hooks";

const PAGE_SIZE = 10;

const naira = (v: number) =>
  `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "referrer";
}

function downloadCSV(items: ReferralDetailItem[], referrer: string, range: string) {
  const header = "Date,Type,Test/Exam,Patient Name,Patient Folder No,Revenue";
  const rows = items.map((it) =>
    [
      formatDate(it.date),
      it.source,
      `"${it.name}"`,
      `"${it.patientName ?? ""}"`,
      `"${it.patientFolderNo ?? ""}"`,
      it.revenue.toFixed(2),
    ].join(",")
  );
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `referred-tests-${sanitizeFilename(referrer)}-${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  referrer: string | null;
  items: ReferralDetailItem[];
  range: string;
  onClose: () => void;
}

export default function ReferralDetailModal({ referrer, items, range, onClose }: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [referrer]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [items.length, page]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open={!!referrer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Referred Tests/Exams — {referrer}
          </DialogTitle>
          <DialogDescription>
            {items.length} request{items.length === 1 ? "" : "s"} referred by "{referrer}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Total paid revenue:{" "}
            <span className="font-mono font-semibold text-slate-800 tabular-nums">
              {naira(items.reduce((s, it) => s + it.revenue, 0))}
            </span>
          </p>
          <Button
            size="sm"
            className="bg-[#005EB8] hover:bg-[#004d9a] text-white gap-2"
            onClick={() => downloadCSV(items, referrer ?? "referrer", range)}
            disabled={items.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No referred requests</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Type</th>
                  <th className="py-2 px-3 font-semibold">Test / Exam</th>
                  <th className="py-2 px-3 font-semibold">Patient</th>
                  <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{formatDate(it.date)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          it.source === "Lab"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        {it.source}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-medium">{it.name}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {it.patientName || "—"}
                      {it.patientFolderNo ? (
                        <span className="ml-1 text-[10px] text-slate-400 font-mono">
                          ({it.patientFolderNo})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 tabular-nums">
                      {naira(it.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 tabular-nums">
              Showing {items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, items.length)} of {items.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              <span className="px-2 text-xs text-slate-500 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
