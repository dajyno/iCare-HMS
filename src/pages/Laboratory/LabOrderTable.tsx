import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  FlaskConical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Syringe,
} from "lucide-react";
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
import Pagination from "@/components/ui/pagination";
import StatusBadge from "./StatusBadge";
const PaymentBadge = ({ status }: { status: string }) => {
  const isPaid = status === "Paid";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
      isPaid
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-amber-50 text-amber-700 border border-amber-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
      {status}
    </span>
  );
};

interface LabOrder {
  id: string;
  orderCode: string;
  testName: string;
  patientName: string;
  patientId: string;
  gender: string;
  dateOfBirth: string;
  status: string;
  dbStatus: string;
  paymentStatus: string;
  raw: any;
  isBatch?: boolean;
}

const columnHelper = createColumnHelper<LabOrder>();

const LabOrderTable = ({
  orders,
  onSelectOrder,
  onViewResult,
  onMarkCollected,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  orders: any[];
  onSelectOrder: (order: any) => void;
  onViewResult: (order: any) => void;
  onMarkCollected: (order: any) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [collectingIds, setCollectingIds] = useState<Set<string>>(new Set());

  const data = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return data;
    const q = globalFilter.toLowerCase();
    return data.filter(
      (r: any) =>
        r.orderCode.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.prescribedBy.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.paymentStatus.toLowerCase().includes(q)
    );
  }, [data, globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("orderCode", {
        header: "Order Code",
        cell: (info) => (
          <span className="font-mono text-[11px] font-semibold text-slate-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("testName", {
        header: "Test Type",
        cell: (info) => (
          <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("patientName", {
        header: "Patient",
        cell: (info) => (
          <span className="text-sm text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("paymentStatus", {
        header: "Payment",
        cell: (info) => <PaymentBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          if (row.original.isBatch) {
            if (row.original.paymentStatus !== "Paid") {
              return (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  UNPAID — Awaiting Payment
                </span>
              );
            }
            return null;
          }
          const currentRow = row.original as any;
          const id = currentRow.id;
          const isUnpaid = currentRow.paymentStatus !== "Paid";

          if (isUnpaid) {
            return (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                UNPAID — Awaiting Payment
              </span>
            );
          }

          if (row.original.dbStatus !== "Requested") return null;
          return (
            <Button
              size="sm"
              variant="outline"
              className="px-3 gap-1.5 text-[11px] font-semibold border-slate-200 text-slate-600 hover:border-[#005EB8] hover:text-[#005EB8]"
              onClick={(e) => {
                e.stopPropagation();
                setCollectingIds((prev) => new Set(prev).add(id));
                onMarkCollected(row.original.raw);
              }}
              disabled={collectingIds.has(id)}
            >
              <Syringe className="w-3 h-3" />
              {collectingIds.has(id) ? "..." : "Mark as Collected"}
            </Button>
          );
        },
      }),
    ],
    [collectingIds, onMarkCollected]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Order Queue</h2>
          <p className="text-[11px] text-slate-500">
            {totalCount} request{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter orders..."
            className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 px-4 py-3"
                    >
                      <button
                        className="flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FlaskConical className="w-8 h-8" />
                      <span className="text-sm">
                        {!Array.isArray(orders)
                          ? "Error loading orders"
                          : "No matching orders found"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={(row.original as any).id}
                    onClick={() => {
                      const clicked = row.original as any;
                      const target = clicked.isBatch ? clicked.raw : clicked.raw;
                      const isDone = clicked.dbStatus === "Completed" || clicked.status === "Done";
                      console.log("[lab-click]", { id: clicked.id, dbStatus: clicked.dbStatus, status: clicked.status, isDone, isBatch: clicked.isBatch });
                      if (isDone && !clicked.isBatch) {
                        onViewResult(target);
                      } else {
                        onSelectOrder(target);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3.5"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
};

export default LabOrderTable;
