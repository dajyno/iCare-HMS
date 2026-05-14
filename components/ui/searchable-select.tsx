import React, { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
  triggerClassName,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            className="h-9"
          />
        </div>
        <ScrollArea className="max-h-[220px]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors text-left",
                    opt.value === value
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-slate-100 text-slate-700"
                  )}
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 shrink-0", opt.value === value ? "opacity-100" : "opacity-0")} />
                  <span>{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
