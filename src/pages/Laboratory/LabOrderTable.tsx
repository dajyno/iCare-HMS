import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
  ListOrdered,
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
import useSmoothScroll from "./useSmoothScroll";

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

interface LabOrder {
  id: string;
  orderCode: string;
  testName: string;
  patientName: string;
  patientId: string;
  gender: string;
  dateOfBirth: string;
  prescribedBy: string;
  status: string;
  dbStatus: string;
  raw: any;
  isBatch?: boolean;
}

const columnHelper = createColumnHelper<LabOrder>();

const LabOrderTable = ({
  orders,
  onSelectOrder,
  onViewResult,
  onMarkCollected,
}: {
  orders: any[];
  onSelectOrder: (order: any) => void;
  onViewResult: (order: any) => void;
  onMarkCollected: (order: any) => void;
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [collectingIds, setCollectingIds] = useState<Set<string>>(new Set());
  const scrollRef = useSmoothScroll<HTMLDivElement>();

  const getGroupKey = (o: any): string | null => {
    return o.batchId || o.consultationId || null;
  };

  const data = useMemo<LabOrder[]>(() => {
    if (!Array.isArray(orders)) return [];

    const groups = new Map<string, any[]>();
    for (const o of orders) {
      const key = getGroupKey(o);
      if (key) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(o);
      }
    }

    const seen = new Set<string>();
    const result: LabOrder[] = [];

    for (const o of orders) {
      const key = getGroupKey(o);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
        const batch = groups.get(key)!;
        const anyAvail = batch.some((b: any) => b.status === "Requested");
        const testNames = batch.map((b: any) => b.test?.name ?? "").filter(Boolean);
        result.push({
          id: key,
          orderCode: `BATCH-${key.slice(-4).toUpperCase()}`,
          testName: testNames.length > 1 ? `${testNames.length} Tests` : (testNames[0] ?? "Unknown"),
          patientName: `${o.patient?.firstName ?? ""} ${o.patient?.lastName ?? ""}`.trim(),
          patientId: o.patient?.id ?? "",
          gender: o.patient?.gender ?? "",
          dateOfBirth: o.patient?.dateOfBirth ?? "",
          prescribedBy: o.consultation?.doctor?.fullName ?? "—",
          status: anyAvail ? "To Do" : mapStatus(batch[0]?.status),
          dbStatus: anyAvail ? "Requested" : batch[0]?.status,
          raw: batch.length > 1 ? batch : batch[0],
          isBatch: batch.length > 1,
        });
      } else {
        result.push({
          id: o.id,
          orderCode: `REQ-${o.id.slice(-6).toUpperCase()}`,
          testName: o.test?.name ?? "Unknown Test",
          patientName: `${o.patient?.firstName ?? ""} ${o.patient?.lastName ?? ""}`.trim(),
          patientId: o.patient?.id ?? "",
          gender: o.patient?.gender ?? "",
          dateOfBirth: o.patient?.dateOfBirth ?? "",
          prescribedBy: o.consultation?.doctor?.fullName ?? "—",
          status: mapStatus(o.status),
          dbStatus: o.status,
          raw: o,
          isBatch: false,
        });
      }
    }
    return result;
  }, [orders]);

  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return data;
    const q = globalFilter.toLowerCase();
    return data.filter(
      (r) =>
        r.orderCode.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.prescribedBy.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
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
          <span className="text-sm font-medium text-slate-900">
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
      columnHelper.accessor("prescribedBy", {
        header: "Prescribed By",
        cell: (info) => (
          <span className="text-sm text-slate-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          if (row.original.isBatch) return null;
          if (row.original.dbStatus !== "Requested") return null;
          const id = row.original.id;
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <ListOrdered className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Order Queue</h2>
            <p className="text-[11px] text-slate-500">
              {filteredData.length} request{filteredData.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="relative w-64">
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
        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[580px]">
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
                    key={row.original.id}
                    onClick={() => {
                      const clicked = row.original;
                      const target = clicked.isBatch ? clicked.raw : clicked.raw;
                      if (clicked.dbStatus === "Completed" && !clicked.isBatch) {
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
          currentPage={table.getState().pagination.pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          totalItems={filteredData.length}
          onPageChange={(p) => table.setPageIndex(p - 1)}
          onPageSizeChange={(s) => table.setPageSize(s)}
        />
      </div>
    </div>
  );
};

export default LabOrderTable;
