import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    diagnostic,
    page,
    pageSize,
    admissionTotalCount,
    setPage,
    setPageSize,
    loadAdmissionClinicalData,
    computeFluidBalance,
    searchPatients,
    finalizeAdmission,
    commitVitals,
    assignMedication,
    updateMedication,
    removeMedication,
    recordAdministration,
    recordFluidEntry,
    authorizeDischarge,
    generateDischargeInvoice,
    saveClinicalNotes,
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
      // Load clinical data only when the patient is opened
      if (admission.vitalsHistory.length === 0) {
        loadAdmissionClinicalData(admission.admissionId);
      }
    },
    [loadAdmissionClinicalData]
  );

  const handleCloseWorkspace = useCallback(() => {
    setSelectedAdmissionId(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
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
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Inpatient & Ward Operations
          </h1>
          <p className="text-sm text-slate-500">
            Active ward board, admissions, and patient diagnostics
          </p>
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

      {/* Diagnostic banner */}
      {diagnostic && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <span className="text-amber-500 font-bold shrink-0">!</span>
          <p>{diagnostic}</p>
        </div>
      )}

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
              onGenerateInvoice={() =>
                generateDischargeInvoice(selectedPatient.admissionId)
              }
              onSaveClinicalNotes={(notes) =>
                saveClinicalNotes(selectedPatient.admissionId, notes)
              }
              onInvoicePaid={(admissionId) =>
                setState((prev) => ({
                  ...prev,
                  activeAdmissions: prev.activeAdmissions.map((a) =>
                    a.admissionId === admissionId
                      ? { ...a, dischargeInvoicePaid: true }
                      : a
                  ),
                }))
              }
              onInvoiceRecovered={(admissionId, invoiceId, paid) =>
                setState((prev) => ({
                  ...prev,
                  activeAdmissions: prev.activeAdmissions.map((a) =>
                    a.admissionId === admissionId
                      ? { ...a, dischargeInvoiceId: invoiceId, dischargeInvoicePaid: paid }
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
              page={page}
              pageSize={pageSize}
              totalCount={admissionTotalCount}
              onPageChange={setPage}
              onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
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
            ? liveAttendingDoctors
            : ["Unassigned"]
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
