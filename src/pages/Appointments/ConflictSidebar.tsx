import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, ChevronDown, ChevronRight } from "lucide-react";
import type { Appointment } from "@/src/lib/types";
import type { DoctorSlot } from "./hooks";


interface ConflictSidebarProps {
  open: boolean;
  onClose: () => void;
  appointments: Appointment[];
  conflictIds: Set<string>;
  doctors: DoctorSlot[];
  onResolve: (appointment: Appointment) => void;
}

export default function ConflictSidebar({
  open,
  onClose,
  appointments,
  conflictIds,
  doctors,
  onResolve,
}: ConflictSidebarProps) {
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);

  const conflictAppointments = useMemo(
    () => appointments.filter((a) => conflictIds.has(a.id)),
    [appointments, conflictIds]
  );

  const groupedByDoctor = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of conflictAppointments) {
      const list = map.get(apt.doctorId) || [];
      list.push(apt);
      map.set(apt.doctorId, list);
    }
    return map;
  }, [conflictAppointments]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-40 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-red-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-bold text-red-700">
            {conflictIds.size} Conflict{conflictIds.size !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conflictAppointments.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            No conflicts detected
          </div>
        ) : (
          Array.from(groupedByDoctor.entries()).map(([doctorId, apts]) => {
            const doctor = doctors.find((d) => d.id === doctorId);
            const isExpanded = expandedDoctor === doctorId;
            return (
              <div key={doctorId} className="border border-red-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedDoctor(isExpanded ? null : doctorId)}
                  className="w-full px-3 py-2.5 flex items-center justify-between bg-red-50/50 hover:bg-red-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className="text-xs font-semibold text-slate-700">{doctor?.name || "Unknown"}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                      {apts.length}
                    </span>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2 space-y-1.5">
                        {apts.map((apt) => {
                          const patientName = apt.patient
                            ? `${apt.patient.firstName} ${apt.patient.lastName}`
                            : "Unknown";
                          const timeStr = new Date(apt.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <div
                              key={apt.id}
                              className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-2.5 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-800 truncate">{patientName}</p>
                                <p className="text-[10px] text-slate-400">{timeStr} · {apt.reason || "—"}</p>
                              </div>
                              <button
                                onClick={() => onResolve(apt)}
                                className="shrink-0 ml-2 px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
