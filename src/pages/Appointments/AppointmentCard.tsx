import { useCallback } from "react";
import type { Appointment } from "@/src/lib/types";
import { STATUS_COLORS } from "./types";

interface AppointmentCardProps {
  appointment: Appointment;
  isConflict: boolean;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
}

export default function AppointmentCard({ appointment, isConflict, onClick, onDragStart }: AppointmentCardProps) {
  const statusClass = isConflict
    ? STATUS_COLORS.Conflict
    : STATUS_COLORS[appointment.status] || STATUS_COLORS.Unconfirmed;
  const isUnavailable = appointment.status === "Unavailable";
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : "Unknown";

  const startStr = new Date(appointment.startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/json", JSON.stringify(appointment));
      e.dataTransfer.effectAllowed = "move";
      onDragStart?.(e, appointment);
    },
    [appointment, onDragStart]
  );

  return (
    <div
      draggable={!isUnavailable}
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        absolute inset-x-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium
        border-l-4 truncate select-none shadow-sm
        transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing
        ${statusClass}
        ${isUnavailable ? "bg-striped bg-slate-100 cursor-not-allowed" : ""}
        ${isConflict ? "animate-pulse ring-2 ring-red-400" : ""}
      `}
      title={`${patientName} — ${startStr} — ${appointment.reason || ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{patientName}</span>
        <span className="shrink-0 opacity-70">{startStr}</span>
      </div>
      {appointment.reason && <div className="truncate opacity-60">{appointment.reason}</div>}
    </div>
  );
}
