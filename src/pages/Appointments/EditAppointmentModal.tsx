import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { X, Loader2, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Appointment, AppointmentStatus } from "@/src/lib/types";
import type { DoctorSlot } from "./hooks";
import { useUpdateAppointment, useDeleteAppointment, useCreateInvoice, findConflicts } from "./hooks";
import { STATUS_COLORS, STATUS_LABELS, STATUS_TRANSITIONS, APPOINTMENT_REASONS } from "./types";

interface EditAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctors: DoctorSlot[];
  appointments: Appointment[];
}

export default function EditAppointmentModal({
  open,
  onClose,
  appointment,
  doctors,
  appointments,
}: EditAppointmentModalProps) {
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();
  const createInvoice = useCreateInvoice();

  const [doctorId, setDoctorId] = useState(appointment?.doctorId || "");
  const [startTime, setStartTime] = useState(appointment?.startTime || "");
  const [endTime, setEndTime] = useState(appointment?.endTime || "");
  const [reason, setReason] = useState(appointment?.reason || "");
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || "Unconfirmed");
  const [invoiceAmount, setInvoiceAmount] = useState(appointment?.invoiceAmount ? String(appointment.invoiceAmount) : "");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Appointment[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const dateStr = startTime ? startTime.split("T")[0] : new Date().toISOString().split("T")[0];

  const handleClose = useCallback(() => {
    setError("");
    setShowConfirmDelete(false);
    setConflicts([]);
    onClose();
  }, [onClose]);

  const availableTransitions = appointment
    ? STATUS_TRANSITIONS[appointment.status] || []
    : [];

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    setStatus(newStatus);
    if (newStatus === "Completed" && !appointment?.invoiceAmount && !invoiceAmount) {
    }
  };

  const handleSave = () => {
    console.log("[EditModal handleSave] appointment.id:", appointment?.id, "doctorId:", doctorId, "status:", status, "startTime:", startTime, "endTime:", endTime);
    if (!appointment) return;
    setError("");

    const existing = findConflicts(appointments, doctorId, startTime, endTime, appointment.id);
    console.log("[EditModal handleSave] conflicts found:", existing.length, existing.map(c => c.id));
    if (existing.length > 0) {
      setConflicts(existing);
      return;
    }

    doSave();
  };

  const handleForceSave = () => {
    setConflicts([]);
    doSave();
  };

  const doSave = () => {
    if (!appointment) return;
    if (!startTime || !endTime) {
      setError("Start and end times are required");
      return;
    }
    let startISO: string, endISO: string;
    try {
      startISO = new Date(startTime).toISOString();
      endISO = new Date(endTime).toISOString();
    } catch {
      setError("Invalid date/time values");
      return;
    }
    console.log("[EditModal doSave] calling updateAppt.mutate with status:", status);
    updateAppt.mutate(
      {
        id: appointment.id,
        doctorId,
        startTime: startISO,
        endTime: endISO,
        reason,
        status,
        invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          console.log("[EditModal doSave] update succeeded, status:", status);
          toast.success("Appointment updated successfully");
          if (status === "Completed" && invoiceAmount && parseFloat(invoiceAmount) > 0 && appointment.patient) {
            const doctor = doctors.find((d) => d.id === doctorId);
            createInvoice.mutate({
              patientId: appointment.patientId,
              doctorName: doctor?.name || "Unknown",
              amount: parseFloat(invoiceAmount),
              appointmentId: appointment.id,
            });
          }
          setTimeout(() => handleClose(), 400);
        },
        onError: (err: any) => {
          console.error("[EditModal doSave] update failed:", err);
          setError(err.message || "Failed to update appointment");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!appointment) return;
    deleteAppt.mutate(appointment.id, {
      onSuccess: () => {
        toast.success("Appointment deleted successfully");
        handleClose();
      },
      onError: (err: any) => setError(err.message || "Failed to delete appointment"),
    });
  };

  if (!open || !appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : "Unknown";

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
            <h2 className="text-lg font-bold text-slate-900">Edit Appointment</h2>
            <p className="text-xs text-slate-400">{patientName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Current Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLORS[appointment.status] || STATUS_COLORS.Unconfirmed}`}
            >
              {STATUS_LABELS[appointment.status]}
            </span>
          </div>

          {/* Patient (read-only) */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Patient
            </label>
            <div className="w-full h-10 text-sm rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-slate-600">
              {patientName}
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Consultant
            </label>
            <select
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setConflicts([]);
              }}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
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
                value={dateStr}
                onChange={(e) => {
                  const d = e.target.value;
                  setConflicts([]);
                  if (startTime) {
                    const timePart = startTime.split("T")[1];
                    setStartTime(`${d}T${timePart}`);
                  }
                  if (endTime) {
                    const timePart = endTime.split("T")[1];
                    setEndTime(`${d}T${timePart}`);
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
                        setStartTime(`${dateStr}T${t}:00`);
                        setConflicts([]);
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
                        setEndTime(`${dateStr}T${t}:00`);
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

          {/* Status Change */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Change Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTransitions.length > 0 ? (
                availableTransitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      status === s
                        ? `${STATUS_COLORS[s]} ring-2 ring-offset-1`
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No transitions available (terminal status)</span>
              )}
            </div>
            {status !== appointment.status && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Status will change from {STATUS_LABELS[appointment.status]} to {STATUS_LABELS[status]}
              </p>
            )}
          </div>

          {/* Invoice Amount (shown when completing) */}
          {status === "Completed" && (
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Invoice Amount (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">₦</span>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-3 h-10 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {invoiceAmount && parseFloat(invoiceAmount) > 0 && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  A draft invoice for ₦{parseFloat(invoiceAmount).toFixed(2)} will be generated
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none"
            />
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
                  onClick={handleForceSave}
                  disabled={updateAppt.isPending}
                  className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                >
                  Save Anyway
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

        <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-100">
          {/* Delete */}
          <div>
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-600">Confirm delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleteAppt.isPending}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  {deleteAppt.isPending ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateAppt.isPending}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {updateAppt.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {updateAppt.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
