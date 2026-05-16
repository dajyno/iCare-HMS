import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Pill, Droplets, LogOut } from "lucide-react";
import type { ActiveAdmission, VitalsRecord, FluidEntry, MedicationSchedule } from "../inpatientTypes";
import PatientBanner from "./PatientBanner";
import JournalVitalsFeed from "./JournalVitalsFeed";
import MedicationMAR from "./MedicationMAR";
import FluidsTracking from "./FluidsTracking";
import DischargeProcessing from "./DischargeProcessing";

interface PatientWorkspaceProps {
  admission: ActiveAdmission;
  fluidBalance: number;
  onClose: () => void;
  onCommitVitals: (vitals: Omit<VitalsRecord, "timestamp">) => void;
  onAssignMedication: (med: MedicationSchedule) => void;
  onRecordAdministration: (
    drugId: string,
    slot: string,
    status: "Administered" | "Missed" | "Skipped",
    note: string
  ) => void;
  onRecordFluidEntry: (
    type: "intake" | "output",
    entry: Omit<FluidEntry, "itemId" | "timestamp">
  ) => void;
  onAuthorizeDischarge: (summary: string) => void;
}

const PatientWorkspace = ({
  admission,
  fluidBalance,
  onClose,
  onCommitVitals,
  onAssignMedication,
  onRecordAdministration,
  onRecordFluidEntry,
  onAuthorizeDischarge,
}: PatientWorkspaceProps) => {
  return (
    <motion.div
      layoutId={`patient-row-${admission.admissionId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
    >
      <PatientBanner admission={admission} onClose={onClose} />

      <div className="p-6">
        <Tabs defaultValue="journal" className="space-y-4">
          <TabsList className="bg-slate-100 p-0.5">
            <TabsTrigger
              value="journal"
              className="gap-1.5 data-[state=active]:bg-white text-xs"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Journal & Vitals
            </TabsTrigger>
            <TabsTrigger
              value="mar"
              className="gap-1.5 data-[state=active]:bg-white text-xs"
            >
              <Pill className="w-3.5 h-3.5" />
              MAR
            </TabsTrigger>
            <TabsTrigger
              value="fluids"
              className="gap-1.5 data-[state=active]:bg-white text-xs"
            >
              <Droplets className="w-3.5 h-3.5" />
              Fluids
            </TabsTrigger>
            <TabsTrigger
              value="discharge"
              className="gap-1.5 data-[state=active]:bg-white text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Discharge
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-0 pt-4">
            <JournalVitalsFeed
              admission={admission}
              onCommitVitals={onCommitVitals}
            />
          </TabsContent>

          <TabsContent value="mar" className="mt-0 pt-4">
            <MedicationMAR
              admission={admission}
              onAssignMedication={onAssignMedication}
              onRecordAdministration={onRecordAdministration}
            />
          </TabsContent>

          <TabsContent value="fluids" className="mt-0 pt-4">
            <FluidsTracking
              admission={admission}
              onRecordFluidEntry={onRecordFluidEntry}
              fluidBalance={fluidBalance}
            />
          </TabsContent>

          <TabsContent value="discharge" className="mt-0 pt-4">
            <DischargeProcessing
              admission={admission}
              onAuthorizeDischarge={onAuthorizeDischarge}
            />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default PatientWorkspace;
