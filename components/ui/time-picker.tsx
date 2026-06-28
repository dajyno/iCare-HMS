"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled,
  className,
}: TimePickerProps) {
  const timeValue = value?.includes("T") ? value.split("T")[1]?.slice(0, 5) : value || ""

  return (
    <Select value={timeValue} onValueChange={(v) => onChange?.(v)} disabled={disabled}>
      <SelectTrigger className={cn("w-full h-10", className)}>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
