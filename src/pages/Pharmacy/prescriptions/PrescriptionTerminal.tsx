import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { Search, Pill, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/src/components/skeletons/PageSkeleton";
import PrescriptionBadge from "./PrescriptionBadge";
import PrescriptionDetail from "./PrescriptionDetail";
import NewPrescriptionDialog from "./NewPrescriptionDialog";
import { usePrescriptionQueue } from "../hooks";
import type { PharmacyPrescription, OrderStatus } from "../types";
import { format } from "date-fns";

interface RowData {
  id: string;
  patientCode: string;
  patientName: string;
  patientDob: string;
  orderStatus: OrderStatus;
  raw: PharmacyPrescription;
}

const columnHelper = createColumnHelper<RowData>();

const PrescriptionTerminal = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredFilter = useDeferredValue(globalFilter);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(14);
  const { data: prescriptionResult, isLoading, error } = usePrescriptionQueue({
    page,
    pageSize,
    search: deferredFilter,
  });
  const prescriptions = prescriptionResult?.prescriptions || [];
  const totalPrescriptions = prescriptionResult?.total || 0;
  const [selectedPrescription, setSelectedPrescription] = useState<PharmacyPrescription | null>(null);
  const [newPrescriptionOpen, setNewPrescriptionOpen] = useState(!!patientIdParam);

  const data = useMemo<RowData[]>(() => {
    if (!Array.isArray(prescriptions)) return [];
    return prescriptions.map((p) => ({
      id: p.id,
      patientCode: p.patientCode,
      patientName: p.patientName,
      patientDob: p.patientDob,
      orderStatus: p.orderStatus,
      raw: p,
    }));
  }, [prescriptions]);

  useEffect(() => {
    setPage(1);
  }, [deferredFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalPrescriptions / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [totalPrescriptions, page, pageSize]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("patientCode", {
        header: "Patient ID",
        cell: (info) => (
          <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("patientName", {
        header: "Patient Name",
        cell: (info) => (
          <span className="text-sm font-medium text-slate-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("patientDob", {
        header: "Date of Birth",
        cell: (info) => {
          const dob = info.getValue();
          return (
            <span className="text-sm tabular-nums text-slate-600">
              {dob ? format(new Date(dob), "MMM dd, yyyy") : "—"}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "date",
        header: "Date / Time",
        cell: ({ row }) => {
          const date = (row.original as RowData).raw.prescriptionDate;
          return (
            <span className="text-sm tabular-nums text-slate-600">
              {date ? format(new Date(date), "MMM dd, yyyy h:mm a") : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("orderStatus", {
        header: "Fulfillment State",
        cell: (info) => <PrescriptionBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "items",
        header: "Items",
        cell: ({ row }) => {
          const count = (row.original as RowData).raw.items.length;
          return (
            <span className={`text-xs font-mono tabular-nums ${count > 0 ? "text-slate-700 font-semibold" : "text-red-400"}`}>
              {count > 0 ? `${count} drug${count > 1 ? "s" : ""}` : "No drugs"}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const handleDialogClose = () => {
    setSelectedPrescription(null);
    queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
  };

  if (isLoading) {
    return (
      <PageSkeleton title="Prescription Terminal" description="Live queue of pending patient prescriptions">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageSkeleton>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prescription Terminal</h1>
            <p className="text-sm text-slate-500">Live queue of pending patient prescriptions</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load prescriptions. {(error as any)?.message || "Please try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prescription Terminal</h1>
          <p className="text-xs text-slate-500">
            {totalPrescriptions} prescription{totalPrescriptions !== 1 ? "s" : ""} in queue
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
          onClick={() => setNewPrescriptionOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          New Prescription
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search patient ID, name..."
              className="pl-9 h-9 text-sm bg-white border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 px-5 py-3.5"
                    >
                      <button
                        className="flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUp className="w-3 h-3" />,
                          desc: <ArrowDown className="w-3 h-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Pill className="w-8 h-8" />
                      <span className="text-sm">
                          {!Array.isArray(prescriptions)
                            ? "Error loading prescriptions"
                          : globalFilter
                          ? "No prescriptions match your search"
                          : "No prescriptions in queue"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowData = row.original as RowData;
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedPrescription(rowData.raw)}
                      className="cursor-pointer hover:bg-sky-50/40 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-5 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={totalPrescriptions}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Dialog open={!!selectedPrescription} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0" showCloseButton={false}>
          {selectedPrescription && (
            <PrescriptionDetail
              prescription={selectedPrescription}
              onClose={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>

      <NewPrescriptionDialog open={newPrescriptionOpen} onOpenChange={setNewPrescriptionOpen} initialPatientId={patientIdParam || undefined} />

      <style>{`
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 12px rgba(6,182,212,0.35); }
          50% { box-shadow: 0 0 20px rgba(6,182,212,0.55), 0 0 40px rgba(6,182,212,0.15); }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionTerminal;
