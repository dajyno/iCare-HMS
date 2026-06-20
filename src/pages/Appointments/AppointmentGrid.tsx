import { useMemo, useCallback, useState } from "react";
import type * as React from "react";
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
  key?: string | number;
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

  const isToday = useMemo(() => {
    const n = new Date();
    return (
      date.getFullYear() === n.getFullYear() &&
      date.getMonth() === n.getMonth() &&
      date.getDate() === n.getDate()
    );
  }, [date]);

  const dynamicStartHour = isToday
    ? Math.max(GRID_START_HOUR, new Date().getHours() - 1)
    : GRID_START_HOUR;
  const visibleStartSlot =
    (dynamicStartHour - GRID_START_HOUR) * (60 / TIME_SLOT_MINUTES);
  const totalSlots = (GRID_END_HOUR - GRID_START_HOUR) * (60 / TIME_SLOT_MINUTES);
  const visibleSlotCount = totalSlots - visibleStartSlot;

  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < visibleSlotCount; i++) {
      labels.push(getTimeFromIndex(visibleStartSlot + i));
    }
    return labels;
  }, [visibleSlotCount, visibleStartSlot]);

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
        const newStartTime = `${dateStr}T${getTimeFromIndex(visibleStartSlot + slotIdx)}:00`;
        const duration = getSlotSpan(appointment.startTime, appointment.endTime) * TIME_SLOT_MINUTES;
        const endDate = new Date(new Date(newStartTime).getTime() + duration * 60000);
        const newEndTime = endDate.toISOString();
        onDragEnd(appointment.id, doctorId, newStartTime, newEndTime);
      } catch {
      }
    },
    [date, onDragEnd, visibleStartSlot]
  );

  const handleCardDragStart = useCallback((_e: React.DragEvent, _appointment: Appointment) => {
  }, []);

  return (
    <div className="overflow-auto rounded-xl border border-blue-100 bg-white shadow-md ring-1 ring-blue-50">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `160px repeat(${visibleSlotCount}, minmax(70px, 1fr))`,
          minWidth: `${160 + visibleSlotCount * 70}px`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 left-0 z-30 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white flex items-center">
          Consultants
        </div>
        {timeLabels.map((label, i) => {
          const isHour = label.endsWith(":00");
          const showLabel = label.endsWith(":00") || label.endsWith(":30");
          return (
            <div
              key={i}
              className={`sticky top-0 z-10 bg-gradient-to-b from-sky-50 to-white border-b border-sky-100 px-1 py-1.5 text-center text-[11px] font-semibold ${
                isHour ? "text-blue-700 border-r-2 border-blue-200" : "text-slate-400 border-r border-slate-100"
              }`}
            >
              {showLabel ? label : ""}
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
              totalSlots={visibleSlotCount}
              visibleStartSlot={visibleStartSlot}
              dynamicStartHour={dynamicStartHour}
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
  key?: string | number;
  doctor: DoctorSlot;
  date: Date;
  totalSlots: number;
  visibleStartSlot: number;
  dynamicStartHour: number;
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
  visibleStartSlot,
  dynamicStartHour,
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

  const visibleAppointments = useMemo(() => {
    const visStartMin = dynamicStartHour * 60;
    const visEndMin = GRID_END_HOUR * 60;
    return appointments.filter((apt) => {
      const d = new Date(apt.startTime);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const endDate = new Date(apt.endTime);
      const endMin = endDate.getHours() * 60 + endDate.getMinutes();
      return startMin < visEndMin && endMin > visStartMin;
    });
  }, [appointments, dynamicStartHour]);

  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    for (const apt of visibleAppointments) {
      let startIdx = getSlotIndex(apt.startTime, dynamicStartHour);
      let span = getSlotSpan(apt.startTime, apt.endTime);
      if (startIdx < 0) {
        span = Math.max(0, span + startIdx);
        startIdx = 0;
      }
      for (let i = 0; i < span; i++) {
        if (startIdx + i < totalSlots) set.add(startIdx + i);
      }
    }
    return set;
  }, [visibleAppointments, dynamicStartHour, totalSlots]);

  return (
    <>
      {/* Doctor label */}
      <div className="sticky left-0 z-10 border-b border-slate-200 border-l-4 border-l-blue-500 bg-white px-3 py-2 flex items-center">
        <span className="text-xs font-semibold text-slate-800 truncate">{doctor.name}</span>
      </div>

      {/* Time slots */}
      <div className="relative border-b border-slate-200" style={{ gridColumn: `span ${totalSlots}` }}>
        <div className="flex" style={{ minHeight: "72px" }}>
          {Array.from({ length: totalSlots }).map((_, slotIdx) => {
            const isOccupied = occupiedSlots.has(slotIdx);
            const isDragOver =
              dragOverDoctorId === doctor.id && dragOverSlotIdx === slotIdx;
            const timeStr = `${dateStr}T${getTimeFromIndex(visibleStartSlot + slotIdx)}:00`;
            return (
              <div
                key={slotIdx}
                onDragOver={(e) => onDragOver(e, doctor.id, slotIdx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, doctor.id, slotIdx)}
                className={`
                  flex-1 border-r border-slate-100 min-h-[72px] relative
                  transition-colors
                  ${isOccupied ? "bg-blue-50/20" : "cursor-pointer hover:bg-blue-50/40"}
                  ${isDragOver ? "bg-blue-100/70 ring-2 ring-blue-400 ring-inset" : ""}
                `}
                style={{ minWidth: "60px" }}
                onClick={() => {
                  if (!isOccupied) onSlotClick(doctor.id, timeStr);
                }}
              />
            );
          })}
        </div>

        {/* Appointment cards */}
        {visibleAppointments.map((apt) => {
          let startIdx = getSlotIndex(apt.startTime, dynamicStartHour);
          const origSpan = getSlotSpan(apt.startTime, apt.endTime);
          const clampedStart = startIdx < 0;
          const span = clampedStart ? Math.max(0, origSpan + startIdx) : origSpan;
          if (clampedStart) startIdx = 0;
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
