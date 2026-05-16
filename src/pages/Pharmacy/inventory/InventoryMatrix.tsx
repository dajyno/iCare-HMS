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
  Search,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Upload,
  AlertTriangle,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Pagination from "@/components/ui/pagination";
import AddItemDialog from "./AddItemDialog";
import UploadCsvDialog from "./UploadCsvDialog";
import { usePharmacyInventory } from "../hooks";
import type { PharmacyInventoryItem } from "../types";

const columnHelper = createColumnHelper<PharmacyInventoryItem>();

const InventoryMatrix = () => {
  const { data: items, isLoading, error } = usePharmacyInventory();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const lowStockCount = useMemo(
    () => (items ?? []).filter((i) => i.status === "Low Stock" || i.status === "Out of Stock").length,
    [items]
  );

  const filteredData = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!globalFilter.trim()) return items;
    const q = globalFilter.toLowerCase();
    return items.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.packageType.toLowerCase().includes(q)
    );
  }, [items, globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-[11px] font-semibold text-slate-600 tracking-wider">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("itemName", {
        header: "Item Name",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor("packageType", {
        header: "Package Type",
        cell: (info) => (
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("unitOfMeasurement", {
        header: "UoM",
        cell: (info) => (
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("unitsRemaining", {
        header: "Units Remaining",
        meta: { align: "right" },
        cell: (info) => {
          const val = info.getValue();
          const row = info.row.original;
          const isLow = row.status === "Low Stock";
          const isOos = row.status === "Out of Stock";
          return (
            <span
              className={`font-mono tabular-nums text-sm font-bold text-right block ${
                isOos
                  ? "text-slate-300"
                  : isLow
                  ? "text-rose-500"
                  : "text-slate-900"
              }`}
            >
              {val.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("unitPrice", {
        header: "Unit Price",
        cell: (info) => (
          <span className="font-mono tabular-nums text-sm text-slate-700 text-right block">
            ₦{info.getValue().toFixed(2)}
          </span>
        ),
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
    initialState: { pagination: { pageSize: 15 } },
  });

  const rows = table.getRowModel().rows;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Matrix</h1>
            <p className="text-sm text-slate-500">Pharmacy stock ledger and supply management</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Matrix</h1>
            <p className="text-sm text-slate-500">Pharmacy stock ledger and supply management</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load inventory. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100">
            <Package className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inventory Matrix</h1>
            <p className="text-xs text-slate-500">
              {filteredData.length} item{filteredData.length !== 1 ? "s" : ""} in stock ledger
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold border-slate-200"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload CSV
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{Array.isArray(items) ? items.length : 0}</div>
            <Package className="w-5 h-5 text-sky-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Low / Out of Stock</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-rose-500 tabular-nums">{lowStockCount}</div>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              ₦{(Array.isArray(items) ? items.reduce((s, i) => s + i.unitsRemaining * i.unitPrice, 0) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search SKU, name, package..."
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
                      <Package className="w-8 h-8" />
                      <span className="text-sm">
                        {!Array.isArray(items)
                          ? "Error loading inventory"
                          : globalFilter
                          ? "No items match your search"
                          : "No inventory items found"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowData = row.original as PharmacyInventoryItem;
                  const oos = rowData.status === "Out of Stock";
                  return (
                    <TableRow
                      key={row.id}
                      className={`transition-colors ${oos ? "opacity-40 pointer-events-none" : "hover:bg-sky-50/40"}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-5 py-3">
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
          currentPage={table.getState().pagination.pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          totalItems={filteredData.length}
          onPageChange={(p) => table.setPageIndex(p - 1)}
          onPageSizeChange={(s) => table.setPageSize(s)}
        />
      </div>

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <UploadCsvDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
};

export default InventoryMatrix;
