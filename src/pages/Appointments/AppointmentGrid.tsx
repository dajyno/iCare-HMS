import { useMemo, useCallback, useState } from "react";
import type { Appointment } from "@/src/lib/types";
import type { DoctorSlot } from "./hooks";
import AppointmentCard from "./AppointmentCard";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  TIME_SLOT_MINUTES,
  getSlotIndex,
  getSlotSpan,
  getTimeFromIndex,
} from "./types";

interface AppointmentGridProps {
  date: Date;
  doctors: DoctorSlot[];
  appointments: Appointment[];
  conflictIds: Set<string>;
  onSlotClick: (doctorId: string, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDragEnd: (appointmentId: string, newDoctorId: string, newStartTime: string, newEndTime: string) => void;
}

export default function AppointmentGrid({
  date,
  doctors,
  appointments,
  conflictIds,
  onSlotClick,
  onAppointmentClick,
  onDragEnd,
}: AppointmentGridProps) {
  const [dragOverDoctorId, setDragOverDoctorId] = useState<string | null>(null);
  const [dragOverSlotIdx, setDragOverSlotIdx] = useState<number | null>(null);

  const totalSlots = (GRID_END_HOUR - GRID_START_HOUR) * (60 / TIME_SLOT_MINUTES);

  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < totalSlots; i++) {
      labels.push(getTimeFromIndex(i));
    }
    return labels;
  }, [totalSlots]);

  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const key = apt.doctorId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, doctorId: string, slotIdx: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverDoctorId(doctorId);
      setDragOverSlotIdx(slotIdx);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverDoctorId(null);
    setDragOverSlotIdx(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, doctorId: string, slotIdx: number) => {
      e.preventDefault();
      setDragOverDoctorId(null);
      setDragOverSlotIdx(null);

      try {
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const appointment: Appointment = JSON.parse(raw);
        const dateStr = date.toISOString().split("T")[0];
        const newStartTime = `${dateStr}T${getTimeFromIndex(slotIdx)}:00`;
        const duration = getSlotSpan(appointment.startTime, appointment.endTime) * TIME_SLOT_MINUTES;
        const endDate = new Date(new Date(newStartTime).getTime() + duration * 60000);
        const newEndTime = endDate.toISOString();
        onDragEnd(appointment.id, doctorId, newStartTime, newEndTime);
      } catch {
      }
    },
    [date, onDragEnd]
  );

  const handleCardDragStart = useCallback((_e: React.DragEvent, _appointment: Appointment) => {
  }, []);

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `160px repeat(${totalSlots}, minmax(40px, 1fr))`,
          minWidth: `${160 + totalSlots * 50}px`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-500">
          Consultants
        </div>
        {timeLabels.map((label, i) => {
          const isNewHour = label.endsWith(":00");
          return (
            <div
              key={i}
              className={`sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-1 py-1 text-center text-[10px] font-medium text-slate-400 ${
                isNewHour ? "border-r-2 border-slate-300" : "border-r border-slate-100"
              }`}
            >
              {label}
            </div>
          );
        })}

        {/* Doctor rows */}
        {doctors.map((doctor) => {
          const doctorAppointments = appointmentMap.get(doctor.id) || [];
          return (
            <DoctorRow
              key={doctor.id}
              doctor={doctor}
              date={date}
              totalSlots={totalSlots}
              appointments={doctorAppointments}
              conflictIds={conflictIds}
              onSlotClick={onSlotClick}
              onAppointmentClick={onAppointmentClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              dragOverDoctorId={dragOverDoctorId}
              dragOverSlotIdx={dragOverSlotIdx}
              onCardDragStart={handleCardDragStart}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DoctorRowProps {
  doctor: DoctorSlot;
  date: Date;
  totalSlots: number;
  appointments: Appointment[];
  conflictIds: Set<string>;
  onSlotClick: (doctorId: string, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDragOver: (e: React.DragEvent, doctorId: string, slotIdx: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, doctorId: string, slotIdx: number) => void;
  dragOverDoctorId: string | null;
  dragOverSlotIdx: number | null;
  onCardDragStart: (e: React.DragEvent, appointment: Appointment) => void;
}

function DoctorRow({
  doctor,
  date,
  totalSlots,
  appointments,
  conflictIds,
  onSlotClick,
  onAppointmentClick,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverDoctorId,
  dragOverSlotIdx,
  onCardDragStart,
}: DoctorRowProps) {
  const dateStr = date.toISOString().split("T")[0];

  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    for (const apt of appointments) {
      const startIdx = getSlotIndex(apt.startTime);
      const span = getSlotSpan(apt.startTime, apt.endTime);
      for (let i = 0; i < span; i++) {
        set.add(startIdx + i);
      }
    }
    return set;
  }, [appointments]);

  return (
    <>
      {/* Doctor label */}
      <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50/50 px-2 py-2 flex items-center">
        <span className="text-xs font-semibold text-slate-700 truncate">{doctor.name}</span>
      </div>

      {/* Time slots */}
      <div className="relative border-b border-slate-200" style={{ gridColumn: `span ${totalSlots}` }}>
        <div className="flex" style={{ minHeight: "64px" }}>
          {Array.from({ length: totalSlots }).map((_, slotIdx) => {
            const isOccupied = occupiedSlots.has(slotIdx);
            const isDragOver =
              dragOverDoctorId === doctor.id && dragOverSlotIdx === slotIdx;
            const timeStr = `${dateStr}T${getTimeFromIndex(slotIdx)}:00`;
            return (
              <div
                key={slotIdx}
                onDragOver={(e) => onDragOver(e, doctor.id, slotIdx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, doctor.id, slotIdx)}
                className={`
                  flex-1 border-r border-slate-100 min-h-[64px] relative
                  transition-colors
                  ${isOccupied ? "bg-slate-50/30" : "cursor-pointer hover:bg-blue-50/50"}
                  ${isDragOver ? "bg-blue-100/70 ring-2 ring-blue-400 ring-inset" : ""}
                `}
                style={{ minWidth: "40px" }}
                onClick={() => {
                  if (!isOccupied) onSlotClick(doctor.id, timeStr);
                }}
              />
            );
          })}
        </div>

        {/* Appointment cards */}
        {appointments.map((apt) => {
          const startIdx = getSlotIndex(apt.startTime);
          const span = getSlotSpan(apt.startTime, apt.endTime);
          return (
            <div
              key={apt.id}
              style={{
                position: "absolute",
                top: "2px",
                left: `${(startIdx / totalSlots) * 100}%`,
                width: `${(span / totalSlots) * 100}%`,
                height: "calc(100% - 4px)",
              }}
            >
              <AppointmentCard
                appointment={apt}
                isConflict={conflictIds.has(apt.id)}
                onClick={() => onAppointmentClick(apt)}
                onDragStart={onCardDragStart}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
