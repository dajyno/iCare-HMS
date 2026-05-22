import { useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Search, X, User, Loader2, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { usePatients, useCreateAppointment, findConflicts, type DoctorSlot } from "./hooks";
import { APPOINTMENT_REASONS } from "./types";
import type { Appointment } from "@/src/lib/types";

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  prefillDoctor?: DoctorSlot;
  prefillTime?: string;
  doctors: DoctorSlot[];
  appointments: Appointment[];
}

export default function NewAppointmentModal({
  open,
  onClose,
  prefillDoctor,
  prefillTime,
  doctors,
  appointments,
}: NewAppointmentModalProps) {
  const createAppt = useCreateAppointment();
  const [patientQuery, setPatientQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(prefillDoctor?.id || "");
  const [startTime, setStartTime] = useState(prefillTime || "");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState(APPOINTMENT_REASONS[0]);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    prefillTime ? prefillTime.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const searchTimeout = useRef<any>(null);

  const { data: patientResults, isLoading: searchingPatients } = usePatients(patientQuery);

  const handleClose = useCallback(() => {
    setPatientQuery("");
    setShowResults(false);
    setSelectedPatient(null);
    setError("");
    setConflicts([]);
    onClose();
  }, [onClose]);

  const handlePatientInput = (value: string) => {
    setPatientQuery(value);
    setSelectedPatient(null);
    setShowResults(true);
    clearTimeout(searchTimeout.current);
  };

  const selectPatient = (p: { id: string; patientId: string; firstName: string; lastName: string }) => {
    setSelectedPatient(p);
    setShowResults(false);
    setPatientQuery("");
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setConflicts([]);
    if (value) {
      const d = new Date(value);
      d.setMinutes(d.getMinutes() + 30);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      setEndTime(`${y}-${m}-${day}T${h}:${min}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }
    if (!selectedDoctorId) {
      setError("Please select a doctor");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please set start and end times");
      return;
    }
    setError("");

    const existing = findConflicts(appointments, selectedDoctorId, startTime, endTime);
    if (existing.length > 0) {
      setConflicts(existing);
      return;
    }

    createAppt.mutate(
      {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reason,
        status: "Unconfirmed",
      },
      {
        onSuccess: () => handleClose(),
        onError: (err: any) => setError(err.message || "Failed to create appointment"),
      }
    );
  };

  const handleForceSubmit = () => {
    if (!selectedPatient || !selectedDoctorId || !startTime || !endTime) return;
    setConflicts([]);
    createAppt.mutate(
      {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reason,
        status: "Unconfirmed",
      },
      {
        onSuccess: () => handleClose(),
        onError: (err: any) => setError(err.message || "Failed to create appointment"),
      }
    );
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <motion.div
        layout
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Appointment</h2>
            <p className="text-xs text-slate-400">Book a new patient appointment</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Patient Search */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Patient
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={patientQuery}
                onChange={(e) => handlePatientInput(e.target.value)}
                placeholder="Search by name or folder no..."
                className="w-full pl-9 pr-3 h-10 text-sm rounded-xl border border-slate-200 bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                onFocus={() => setShowResults(true)}
              />
            </div>
            {showResults && patientQuery.trim().length >= 2 && (
              <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
                {searchingPatients ? (
                  <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
                ) : !patientResults || patientResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">No patients found</div>
                ) : (
                  patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm hover:bg-sky-50 flex items-center justify-between transition-colors"
                      onClick={() => selectPatient(p)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div>
                          <span className="font-medium text-slate-900">{p.firstName} {p.lastName}</span>
                          <span className="block text-[11px] font-mono text-slate-400">{p.patientId}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-1.5 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
                <span className="font-mono text-[11px] text-blue-500">{selectedPatient.patientId}</span>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="ml-auto text-blue-400 hover:text-blue-600 text-xs"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Consultant
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setConflicts([]);
              }}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select consultant...</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const nd = e.target.value;
                  setSelectedDate(nd);
                  setConflicts([]);
                  if (startTime) {
                    const tp = startTime.split("T")[1];
                    setStartTime(`${nd}T${tp}`);
                  }
                  if (endTime) {
                    const tp = endTime.split("T")[1];
                    setEndTime(`${nd}T${tp}`);
                  }
                }}
                className="w-full h-10 text-sm rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={startTime ? startTime.split("T")[1]?.slice(0, 5) || "" : ""}
                  onChange={(e) => {
                    const t = e.target.value;
                    if (t) {
                      const iso = `${selectedDate}T${t}:00`;
                      handleStartTimeChange(iso);
                    }
                  }}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* End Time */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              End Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="time"
                value={endTime ? endTime.split("T")[1]?.slice(0, 5) || "" : ""}
                onChange={(e) => {
                    const t = e.target.value;
                    if (t) {
                      setEndTime(`${selectedDate}T${t}:00`);
                      setConflicts([]);
                    }
                }}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              {APPOINTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>
          )}

          {conflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Time conflict with {conflicts.length} existing appointment{conflicts.length > 1 ? "s" : ""}
              </p>
              <ul className="text-[11px] text-amber-700 space-y-1">
                {conflicts.map((c) => {
                  const name = c.patient
                    ? `${c.patient.firstName} ${c.patient.lastName}`
                    : "Unknown";
                  const t = `${new Date(c.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — ${new Date(c.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
                  return (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {name} ({t})
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleForceSubmit}
                  disabled={createAppt.isPending}
                  className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                >
                  Book Anyway
                </button>
                <button
                  onClick={() => setConflicts([])}
                  className="px-3 py-1.5 text-xs text-amber-600 hover:text-amber-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createAppt.isPending}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {createAppt.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {createAppt.isPending ? "Booking..." : "Book Appointment"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
