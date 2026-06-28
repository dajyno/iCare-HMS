import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GlobalFilters } from "../types";

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onChange: (filters: GlobalFilters) => void;
}

const DEPARTMENTS = [
  "All Departments",
  "Internal Medicine",
  "Surgery",
  "Pediatrics",
  "OB/GYN",
  "Orthopedics",
  "Cardiology",
  "Family Medicine",
  "Laboratory",
  "Pharmacy",
  "Radiology",
];

export default function GlobalFilterBar({ filters, onChange }: GlobalFilterBarProps) {
  const [local, setLocal] = useState<GlobalFilters>(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const handleApply = () => {
    onChange(local);
  };

  const handleReset = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const reset: GlobalFilters = {
      dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
      dateTo: today.toISOString().slice(0, 10),
      department: "all",
    };
    setLocal(reset);
    onChange(reset);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">From</label>
        <DatePicker
          value={local.dateFrom ?? ""}
          onChange={(v) => setLocal({ ...local, dateFrom: v || null })}
          className="w-36 h-9 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">To</label>
        <DatePicker
          value={local.dateTo ?? ""}
          onChange={(v) => setLocal({ ...local, dateTo: v || null })}
          className="w-36 h-9 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
        <Select
          value={local.department}
          onValueChange={(v) => setLocal({ ...local, department: v })}
        >
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((dep) => (
              <SelectItem key={dep} value={dep === "All Departments" ? "all" : dep}>
                {dep}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-9 px-4 text-xs font-bold" onClick={handleApply}>
          Apply
        </Button>
        <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}
