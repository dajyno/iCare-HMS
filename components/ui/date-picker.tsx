"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (dateStr: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromYear?: number
  toYear?: number
}

const buttonBase =
  "inline-flex items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = value ? new Date(value + "T00:00:00") : undefined

  const handleSelect = (selected: Date | undefined) => {
    setOpen(false)
    if (selected && onChange) {
      onChange(format(selected, "yyyy-MM-dd"))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(buttonBase, !date && "text-muted-foreground", "w-full h-10", className)}
        disabled={disabled}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          captionLayout={fromYear !== undefined || toYear !== undefined ? "dropdown" : undefined}
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  )
}
