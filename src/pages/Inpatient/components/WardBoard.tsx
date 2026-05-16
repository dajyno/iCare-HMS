import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Bed,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ActiveAdmission } from "../inpatientTypes";
import StatusBadge from "./StatusBadge";

const columnHelper = createColumnHelper<ActiveAdmission & { wardBed: string }>();

const WardBoard = ({
  admissions,
  onSelectPatient,
}: {
  admissions: ActiveAdmission[];
  onSelectPatient: (admission: ActiveAdmission) => void;
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "wardBed", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo(
    () =>
      admissions.map((a) => ({
        ...a,
        wardBed: `${a.wardCode} / ${a.bedNo}`,
      })),
    [admissions]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("wardBed", {
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Ward/Bed Code
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
          <div className="flex items-center gap-2">
            <Bed className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-sm font-medium text-slate-900">
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("patient", {
        id: "patientName",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Patient Name & Folder ID
          </span>
        ),
        cell: (info) => (
          <div>
            <p className="text-sm font-medium text-slate-900">
              {info.getValue().name}
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              {info.getValue().folderNo}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("attendingPhysician", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Admitting Doctor
          </span>
        ),
        cell: (info) => (
          <span className="text-sm text-slate-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("daysAdmitted", {
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Days
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
          <span className="text-sm font-mono text-slate-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("admissionId", {
        id: "condition",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Primary Condition
          </span>
        ),
        cell: () => (
          <span className="text-sm text-slate-600">Under Observation</span>
        ),
      }),
      columnHelper.accessor("careStatus", {
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Care Status
          </span>
        ),
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (admissions.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-300">
        <Bed className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">
          No Active Admissions
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Click "+ New Admission" to admit a patient
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search by name, ward, or folder..."
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

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
            {table.getRowModel().rows.map((row, index) => {
              const admission = row.original as ActiveAdmission & { wardBed: string };
              return (
              <motion.tr
                key={admission.admissionId}
                layoutId={`patient-row-${admission.admissionId}`}
                onClick={() => onSelectPatient(admission)}
                className="group cursor-pointer transition-colors hover:bg-sky-50/50 border-b border-slate-50 last:border-0"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
        <span>
          {table.getRowModel().rows.length} of {admissions.length} active
          admissions
        </span>
        <span className="text-[10px] text-slate-300">
          Click a row to open diagnostics workspace
        </span>
      </div>
    </div>
  );
};

export default WardBoard;
