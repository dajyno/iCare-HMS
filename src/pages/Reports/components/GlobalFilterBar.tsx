import { useState, useEffect } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { GlobalFilters } from "../types";

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onChange: (filters: GlobalFilters) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function GlobalFilterBar({
  filters,
  onChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: GlobalFilterBarProps) {
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
      {onSearchChange && (
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? "Search..."}
              className="pl-9 h-9 text-sm w-full"
            />
          </div>
        </div>
      )}
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
