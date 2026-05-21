import type { AppointmentStatus } from "@/src/lib/types";

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  Unconfirmed: "bg-amber-100 text-amber-700 border-amber-200",
  Confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  Waiting: "bg-purple-100 text-purple-700 border-purple-200",
  Ongoing: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Conflict: "bg-red-100 text-red-700 border-red-200",
  Unavailable: "bg-slate-100 text-slate-400 border-slate-200",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-200",
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  Unconfirmed: "Unconfirmed",
  Confirmed: "Confirmed",
  Waiting: "Waiting",
  Ongoing: "Ongoing",
  Completed: "Completed",
  Conflict: "Conflict",
  Unavailable: "Unavailable",
  Cancelled: "Cancelled",
};

export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Unconfirmed: ["Confirmed", "Cancelled"],
  Confirmed: ["Waiting", "Conflict", "Cancelled"],
  Waiting: ["Ongoing", "Cancelled"],
  Ongoing: ["Completed"],
  Completed: [],
  Conflict: ["Confirmed", "Cancelled"],
  Unavailable: ["Confirmed"],
  Cancelled: [],
};

export const APPOINTMENT_REASONS = [
  "General Consultation",
  "Follow-up",
  "Procedure",
  "Emergency",
  "Routine Checkup",
];

export const TIME_SLOT_MINUTES = 30;
export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 20;

export function getSlotIndex(time: string): number {
  const d = new Date(time);
  const minutes = d.getHours() * 60 + d.getMinutes();
  return Math.floor((minutes - GRID_START_HOUR * 60) / TIME_SLOT_MINUTES);
}

export function getTimeFromIndex(index: number): string {
  const totalMinutes = GRID_START_HOUR * 60 + index * TIME_SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getSlotSpan(startTime: string, endTime: string): number {
  const s = new Date(startTime).getTime();
  const e = new Date(endTime).getTime();
  const diffMin = (e - s) / 60000;
  return Math.max(1, Math.round(diffMin / TIME_SLOT_MINUTES));
}

export function isSlotDateToday(date: Date, slotDate: Date): boolean {
  return (
    date.getFullYear() === slotDate.getFullYear() &&
    date.getMonth() === slotDate.getMonth() &&
    date.getDate() === slotDate.getDate()
  );
}
