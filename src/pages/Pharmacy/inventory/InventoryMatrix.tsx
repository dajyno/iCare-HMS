import React, { useState, useMemo } from "react";
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
  Trash2,
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
import EditItemDialog from "./EditItemDialog";
import { usePharmacyInventory, useDeleteInventoryItem } from "../hooks";
import type { PharmacyInventoryItem } from "../types";

const columnHelper = createColumnHelper<PharmacyInventoryItem>();

const InventoryMatrix = () => {
  const { data: items, isLoading, error } = usePharmacyInventory();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [oosFilter, setOosFilter] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState<PharmacyInventoryItem | null>(null);
  const deleteItem = useDeleteInventoryItem();

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${name}" from inventory? This cannot be undone.`)) {
      deleteItem.mutate(id);
    }
  };

  const lowStockCount = useMemo(
    () => (items ?? []).filter((i) => i.status === "Low Stock" || i.status === "Out of Stock").length,
    [items]
  );

  const filteredData = useMemo(() => {
    if (!Array.isArray(items)) return [];
    let result = items;
    if (oosFilter) {
      result = result.filter((r) => r.status === "Out of Stock");
    }
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.itemName.toLowerCase().includes(q) ||
          r.packageType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, globalFilter, oosFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: (info) => {
          const oos = info.row.original.status === "Out of Stock";
          return (
            <span className={`font-mono text-[11px] font-semibold tracking-wider ${oos ? "text-red-300" : "text-slate-600"}`}>
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor("itemName", {
        header: "Item Name",
        cell: (info) => {
          const oos = info.row.original.status === "Out of Stock";
          return (
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${oos ? "text-red-500" : "text-slate-900"}`}>{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("packageType", {
        header: "Package Type",
        cell: (info) => {
          const oos = info.row.original.status === "Out of Stock";
          return (
            <span className={`text-xs font-medium uppercase tracking-wider ${oos ? "text-red-300" : "text-slate-500"}`}>{info.getValue()}</span>
          );
        },
      }),
      columnHelper.accessor("unitOfMeasurement", {
        header: "UoM",
        cell: (info) => {
          const oos = info.row.original.status === "Out of Stock";
          return (
            <span className={`text-[11px] uppercase tracking-wider font-semibold ${oos ? "text-red-300" : "text-slate-400"}`}>{info.getValue()}</span>
          );
        },
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
                  ? "text-red-400"
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
        cell: (info) => {
          const oos = info.row.original.status === "Out of Stock";
          return (
            <span className={`font-mono tabular-nums text-sm text-right block ${oos ? "text-red-300" : "text-slate-700"}`}>
              ₦{info.getValue().toFixed(2)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const rowData = row.original as PharmacyInventoryItem;
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setEditItem(rowData); }}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={(e) => handleDelete(e, rowData.id, rowData.itemName)}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-3">
          <div className="relative w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search SKU, name, package..."
              className="pl-9 h-9 text-sm bg-white border-slate-200"
            />
          </div>
          <button
            onClick={() => setOosFilter((v) => !v)}
            className={`h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
              oosFilter
                ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                : "bg-white text-slate-400 ring-1 ring-slate-200 hover:ring-red-200 hover:text-red-500"
            }`}
          >
            Out of Stock {oosFilter && items ? `(${items.filter((i) => i.status === "Out of Stock").length})` : ""}
          </button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const align = (header.column.columnDef.meta as any)?.align === "right";
                    return (
                      <TableHead
                        key={header.id}
                        className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 px-5 py-3.5 ${align ? "text-right" : ""}`}
                      >
                        <button
                          className={`flex items-center gap-1 select-none ${align ? "justify-end" : ""}`}
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
                    );
                  })}
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
                      className={`transition-colors cursor-pointer ${oos ? "bg-red-50/60 hover:bg-red-100/60" : "hover:bg-sky-50/40"}`}
                      onClick={() => setEditItem(rowData)}
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
      <EditItemDialog item={editItem} open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }} />
    </div>
  );
};

export default InventoryMatrix;
