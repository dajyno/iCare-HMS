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
  Scan,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ListOrdered,
  Plus,
  FolderEdit,
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

interface LedgerRow {
  id: string;
  dateTime: string;
  folderNo: string;
  patientName: string;
  testType: string;
  status: string;
  raw: any;
}

const columnHelper = createColumnHelper<LedgerRow>();

const RadiologyLedger = ({
  requests,
  onSelectRequest,
  onNewExam,
  onManageCategories,
}: {
  requests: any[];
  onSelectRequest: (req: any) => void;
  onNewExam: () => void;
  onManageCategories: () => void;
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo<LedgerRow[]>(() => {
    if (!Array.isArray(requests)) return [];
    return requests.map((r: any) => ({
      id: r.id,
      dateTime: r.createdAt
        ? new Date(r.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      folderNo: r.folderNo ?? r.patient?.patientId ?? "—",
      patientName: `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.trim() || "—",
      testType: r.exam?.name ?? "—",
      status: r.status,
      raw: r,
    }));
  }, [requests]);

  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return data;
    const q = globalFilter.toLowerCase();
    return data.filter(
      (r) =>
        r.folderNo.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.testType.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [data, globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("dateTime", {
        header: "Date / Time",
        cell: (info) => (
          <span className="text-xs font-mono text-slate-600">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("folderNo", {
        header: "Folder No",
        cell: (info) => (
          <span className="text-xs font-mono font-semibold text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("patientName", {
        header: "Patient Name",
        cell: (info) => (
          <span className="text-sm font-medium text-slate-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("testType", {
        header: "Test Type",
        cell: (info) => (
          <span className="text-sm text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
    ],
    []
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Scan className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Examination Ledger</h1>
            <p className="text-xs text-slate-500">
              {filteredData.length} examination{filteredData.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-4 gap-1.5 text-xs font-semibold border-slate-200"
            onClick={onManageCategories}
          >
            <FolderEdit className="w-3.5 h-3.5" />
            Manage Categories
          </Button>
          <Button
            size="sm"
            className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-4 gap-2 font-semibold text-xs"
            onClick={onNewExam}
          >
            <Plus className="w-3.5 h-3.5" />
            New Examination
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter examinations..."
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
                      <Scan className="w-8 h-8" />
                      <span className="text-sm">
                        {!Array.isArray(requests)
                          ? "Error loading examinations"
                          : "No examinations found"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.original.id}
                    onClick={() => onSelectRequest(row.original.raw)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

export default RadiologyLedger;
