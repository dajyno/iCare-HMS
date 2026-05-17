import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Settings, Bed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInpatientState } from "./useInpatientState";
import { useStaff } from "../Staff/StaffContext";
import WardBoard from "./components/WardBoard";
import NewAdmissionWizard from "./components/NewAdmissionWizard";
import PatientWorkspace from "./components/PatientWorkspace";
import InpatientSettings from "./components/InpatientSettings";
import type { ActiveAdmission } from "./inpatientTypes";

const InpatientOverview = () => {
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [showAdmissionWizard, setShowAdmissionWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { records: staffRecords } = useStaff();

  const liveAttendingDoctors = useMemo(
    () =>
      staffRecords
        .filter((r) => r.is_clinician && r.availability_status !== "On Leave")
        .map((r) => r.name),
    [staffRecords]
  );

  const {
    state,
    loading,
    computeFluidBalance,
    searchPatients,
    attendingDoctors,
    finalizeAdmission,
    commitVitals,
    assignMedication,
    updateMedication,
    removeMedication,
    recordAdministration,
    recordFluidEntry,
    authorizeDischarge,
    updateWardConfig,
    updateBedStatus,
    addWard,
    deleteWard,
    searchMedications,
    getBedPrice,
    setState,
  } = useInpatientState();

  const selectedPatient = useMemo(
    () => state.activeAdmissions.find((a) => a.admissionId === selectedAdmissionId) ?? null,
    [state.activeAdmissions, selectedAdmissionId]
  );

  const handleSelectPatient = useCallback(
    (admission: ActiveAdmission) => {
      setSelectedAdmissionId(admission.admissionId);
    },
    []
  );

  const handleCloseWorkspace = useCallback(() => {
    setSelectedAdmissionId(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm text-slate-400">Loading inpatient data...</p>
        </div>
      </div>
    );
  }

  const selectedFluidBalance = selectedPatient
    ? computeFluidBalance(selectedPatient.admissionId)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100">
            <Bed className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Inpatient & Ward Operations
            </h1>
            <p className="text-sm text-slate-500">
              Active ward board, admissions, and patient diagnostics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 border-slate-200"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </Button>
          <Button
            onClick={() => setShowAdmissionWizard(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white h-9 px-4 gap-2 font-semibold text-xs shadow-lg shadow-sky-200"
          >
            <Plus className="w-4 h-4" />
            New Admission
          </Button>
        </div>
      </div>

      {/* View A: Active Ward Board / View C: Patient Workspace */}
      <AnimatePresence mode="wait">
        {selectedPatient ? (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PatientWorkspace
              admission={selectedPatient}
              fluidBalance={selectedFluidBalance}
              onClose={handleCloseWorkspace}
              onBack={handleCloseWorkspace}
              onCommitVitals={(vitals) =>
                commitVitals(selectedPatient.admissionId, vitals)
              }
              onAssignMedication={(med) =>
                assignMedication(selectedPatient.admissionId, med)
              }
              onUpdateMedication={(drugId, med) =>
                updateMedication(selectedPatient.admissionId, drugId, med)
              }
              onRemoveMedication={(drugId) =>
                removeMedication(selectedPatient.admissionId, drugId)
              }
              onRecordAdministration={(drugId, slot, status, note) =>
                recordAdministration(
                  selectedPatient.admissionId,
                  drugId,
                  slot,
                  status,
                  note
                )
              }
              onRecordFluidEntry={(type, entry) =>
                recordFluidEntry(selectedPatient.admissionId, type, entry)
              }
              onAuthorizeDischarge={(summary) =>
                authorizeDischarge(selectedPatient.admissionId, summary)
              }
              onSaveClinicalNotes={(notes) =>
                setState((prev) => ({
                  ...prev,
                  activeAdmissions: prev.activeAdmissions.map((a) =>
                    a.admissionId === selectedPatient.admissionId
                      ? { ...a, clinicalNotes: notes }
                      : a
                  ),
                }))
              }
              searchMedications={searchMedications}
              getBedPrice={getBedPrice}
            />
          </motion.div>
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <WardBoard
              admissions={state.activeAdmissions}
              onSelectPatient={handleSelectPatient}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* View B: New Admission Wizard Modal */}
      <NewAdmissionWizard
        open={showAdmissionWizard}
        onClose={() => setShowAdmissionWizard(false)}
        wardConfiguration={state.wardConfiguration}
        searchPatients={searchPatients}
        attendingDoctors={
          liveAttendingDoctors.length > 0
            ? [...new Set([...attendingDoctors, ...liveAttendingDoctors])]
            : attendingDoctors
        }
        onFinalize={finalizeAdmission}
      />

      {/* View D: Inpatient Settings Dialog */}
      <InpatientSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        wardConfiguration={state.wardConfiguration}
        onUpdateWardConfig={updateWardConfig}
        onUpdateBedStatus={updateBedStatus}
        onAddWard={addWard}
        onDeleteWard={deleteWard}
      />
    </div>
  );
};

export default InpatientOverview;
