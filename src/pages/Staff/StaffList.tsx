import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  UserPlus,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStaff } from "./StaffContext";
import { POSITION_FILTERS } from "./data";
import AddStaffModal from "./AddStaffDrawer";
import StaffUploadModal from "./StaffUploadModal";
import type { StaffRecord } from "./types";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Off-Duty": "bg-slate-100 text-slate-500 border-slate-200",
  "On Leave": "bg-amber-100 text-amber-700 border-amber-200",
};

const columnHelper = createColumnHelper<StaffRecord>();

export default function StaffList() {
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const { records } = useStaff();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Staff");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    let list = records;

    if (activeFilter === "Others") {
      list = list.filter((r) => !POSITION_FILTERS.includes(r.position));
    } else if (activeFilter !== "All Staff") {
      list = list.filter((r) => r.position === activeFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.staff_id.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      );
    }

    return list;
  }, [records, activeFilter, searchTerm]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("staff_id", {
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Staff ID
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </button>
        ),
        cell: (info) => (
          <span className="font-mono text-sm font-medium text-slate-900">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("name", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Full Name
          </span>
        ),
        cell: (info) => (
          <span className="text-sm font-medium text-slate-900">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("position", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Position
          </span>
        ),
        cell: (info) => (
          <span className="text-sm text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("department", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Assigned Department
          </span>
        ),
        cell: (info) => (
          <span className="text-sm text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("availability_status", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Availability Status
          </span>
        ),
        cell: (info) => (
          <Badge
            className={cn(
              "text-[11px] font-medium px-2 py-0.5",
              STATUS_STYLES[info.getValue()]
            )}
          >
            {info.getValue()}
          </Badge>
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
  });

  return (
    <>
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Staff & HR Management
            </h1>
            <p className="text-sm text-slate-500">
              Centralized roster, identity, and permissions controller
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowUploadModal(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-slate-300 text-slate-600 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white h-9 px-4 gap-2 font-semibold text-xs shadow-lg shadow-sky-200 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add New Staff
            </Button>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 pb-3 border-b border-slate-100">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, or department..."
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Horizontal Filter Pills */}
          <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100">
            {["All Staff", ...POSITION_FILTERS, "Others"].map((pos) => (
              <button
                key={pos}
                onClick={() => setActiveFilter(pos)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  activeFilter === pos
                    ? "bg-sky-100 text-sky-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Table */}
          {filteredData.length === 0 ? (
            <div className="text-center py-24">
              <UserPlus className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">
                No Staff Found
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm
                  ? "Try a different search term or filter"
                  : 'Click "+ Add New Staff" to onboard an employee'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-slate-100">
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left bg-slate-50/50"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {table.getRowModel().rows.map((row, index) => {
                      const record: any = row.original;
                      return (
                        <motion.tr
                          key={record.staff_id}
                          layout
                          layoutId={`staff-row-${record.staff_id}`}
                          onClick={() =>
                            navigate(`/${hospital_slug}/staff/${record.staff_id}`)
                          }
                          className={cn(
                            "group cursor-pointer transition-colors hover:bg-sky-50/50 border-b border-slate-50 last:border-0",
                            record.availability_status === "Off-Duty" &&
                              "opacity-50"
                          )}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            delay: index * 0.02,
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer stats */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>
              {filteredData.length} of {records.length} staff members
            </span>
            <span className="text-[10px] text-slate-300">
              Click a row to manage profile and permissions
            </span>
          </div>
        </div>
      </div>

      <AddStaffModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      <StaffUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </>
  );
}
