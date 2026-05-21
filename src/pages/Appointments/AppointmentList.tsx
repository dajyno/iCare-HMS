import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  List,
  Grid,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { useAppointments, useDoctors, useUpdateAppointment } from "./hooks";
import AppointmentGrid from "./AppointmentGrid";
import NewAppointmentModal from "./NewAppointmentModal";
import EditAppointmentModal from "./EditAppointmentModal";
import ConflictSidebar from "./ConflictSidebar";
import { detectConflicts } from "./hooks";
import { STATUS_COLORS, STATUS_LABELS } from "./types";
import type { Appointment } from "@/src/lib/types";
import type { DoctorSlot } from "./hooks";

const AppointmentList = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showConflictSidebar, setShowConflictSidebar] = useState(false);
  const [prefillSlot, setPrefillSlot] = useState<{ doctor: DoctorSlot; time: string } | null>(null);

  const { data: appointments = [] } = useAppointments(selectedDate);
  const { data: doctors = [] } = useDoctors();

  const conflictIds = useMemo(() => detectConflicts(appointments), [appointments]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const counts: Record<string, number> = {};
    for (const apt of appointments) {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    }
    return { total, ...counts } as Record<string, number>;
  }, [appointments]);

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleSlotClick = useCallback(
    (doctorId: string, time: string) => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (doctor) {
        setPrefillSlot({ doctor, time });
        setShowNewModal(true);
      }
    },
    [doctors]
  );

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
  }, []);

  const updateAppt = useUpdateAppointment();
  const handleDragEnd = useCallback(
    (appointmentId: string, newDoctorId: string, newStartTime: string, newEndTime: string) => {
      updateAppt.mutate({
        id: appointmentId,
        doctorId: newDoctorId,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    },
    [updateAppt]
  );

  const handleCloseEdit = useCallback(() => {
    setEditingAppointment(null);
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Resource-based scheduling grid</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Conflict badge */}
          {conflictIds.size > 0 && (
            <button
              onClick={() => setShowConflictSidebar(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {conflictIds.size} Conflict{conflictIds.size !== 1 ? "s" : ""}
            </button>
          )}

          <button
            onClick={() => {
              setPrefillSlot(null);
              setShowNewModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        <StatBadge label="Total" count={stats.total} color="bg-slate-100 text-slate-700" />
        <StatBadge label="Unconfirmed" count={stats.Unconfirmed || 0} color={STATUS_COLORS.Unconfirmed} />
        <StatBadge label="Confirmed" count={stats.Confirmed || 0} color={STATUS_COLORS.Confirmed} />
        <StatBadge label="Waiting" count={stats.Waiting || 0} color={STATUS_COLORS.Waiting} />
        <StatBadge label="Ongoing" count={stats.Ongoing || 0} color={STATUS_COLORS.Ongoing} />
        <StatBadge label="Completed" count={stats.Completed || 0} color={STATUS_COLORS.Completed} />
        <StatBadge label="Conflict" count={stats.Conflict || 0} color={STATUS_COLORS.Conflict} />
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <span className="text-base font-bold text-slate-800">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </span>
          <CalendarIcon className="w-4 h-4 text-slate-400" />
        </div>
        <button
          onClick={handleNextDay}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <AppointmentGrid
            key="grid"
            date={selectedDate}
            doctors={doctors}
            appointments={appointments}
            conflictIds={conflictIds}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <ListView
            appointments={appointments}
            conflictIds={conflictIds}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showNewModal && (
          <NewAppointmentModal
            open={showNewModal}
            onClose={() => {
              setShowNewModal(false);
              setPrefillSlot(null);
            }}
            prefillDoctor={prefillSlot?.doctor}
            prefillTime={prefillSlot?.time}
            doctors={doctors}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAppointment && (
          <EditAppointmentModal
            open={!!editingAppointment}
            onClose={handleCloseEdit}
            appointment={editingAppointment}
            doctors={doctors}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConflictSidebar && (
          <ConflictSidebar
            open={showConflictSidebar}
            onClose={() => setShowConflictSidebar(false)}
            appointments={appointments}
            conflictIds={conflictIds}
            doctors={doctors}
            onResolve={(apt) => {
              setEditingAppointment(apt);
              setShowConflictSidebar(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>
      {label}: {count}
    </span>
  );
}

function ListView({
  appointments,
  conflictIds,
  onAppointmentClick,
}: {
  appointments: Appointment[];
  conflictIds: Set<string>;
  onAppointmentClick: (apt: Appointment) => void;
}) {
  return (
    <div className="space-y-2">
      {appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No appointments for this day</p>
        </div>
      ) : (
        appointments.map((apt) => {
          const isConflict = conflictIds.has(apt.id);
          const patientName = apt.patient
            ? `${apt.patient.firstName} ${apt.patient.lastName}`
            : "Unknown";
          const timeStr = `${new Date(apt.startTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })} — ${new Date(apt.endTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
          return (
            <div
              key={apt.id}
              onClick={() => onAppointmentClick(apt)}
              className={`flex items-center justify-between bg-white border rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition-all ${
                isConflict ? "border-red-300 ring-1 ring-red-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-500">
                    {patientName.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
                  <p className="text-xs text-slate-400">{timeStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {apt.reason && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{apt.reason}</span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isConflict ? STATUS_COLORS.Conflict : STATUS_COLORS[apt.status] || STATUS_COLORS.Unconfirmed
                  }`}
                >
                  {isConflict ? "Conflict" : STATUS_LABELS[apt.status]}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default AppointmentList;
