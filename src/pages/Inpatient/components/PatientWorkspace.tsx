import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Pill, Droplets, LogOut } from "lucide-react";
import type { ActiveAdmission, VitalsRecord, FluidEntry, MedicationSchedule, WardConfig } from "../inpatientTypes";
import PatientBanner from "./PatientBanner";
import JournalVitalsFeed from "./JournalVitalsFeed";
import MedicationMAR from "./MedicationMAR";
import FluidsTracking from "./FluidsTracking";
import DischargeProcessing from "./DischargeProcessing";

interface PatientWorkspaceProps {
  admission: ActiveAdmission;
  fluidBalance: number;
  onClose: () => void;
  onBack: () => void;
  onCommitVitals: (vitals: Omit<VitalsRecord, "timestamp">) => void;
  onAssignMedication: (med: MedicationSchedule) => void;
  onUpdateMedication: (drugId: string, med: MedicationSchedule) => void;
  onRemoveMedication: (drugId: string) => void;
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
  onGenerateInvoice: () => Promise<{ invoiceNumber: string } | null>;
  onSaveClinicalNotes: (notes: string) => void;
  onInvoicePaid: (admissionId: string) => void;
  onInvoiceRecovered: (admissionId: string, invoiceId: string, paid: boolean) => void;
  searchMedications: (query: string) => Promise<{ drugId: string; name: string; unitPrice: number }[]>;
  getBedPrice: (wardCode: string, bedNo: string) => number;
}

const PatientWorkspace = ({
  admission,
  fluidBalance,
  onClose,
  onBack,
  onCommitVitals,
  onAssignMedication,
  onUpdateMedication,
  onRemoveMedication,
  onRecordAdministration,
  onRecordFluidEntry,
  onAuthorizeDischarge,
  onGenerateInvoice,
  onSaveClinicalNotes,
  onInvoicePaid,
  onInvoiceRecovered,
  searchMedications,
  getBedPrice,
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
      <PatientBanner admission={admission} onClose={onClose} onBack={onBack} />

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
              Medications
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
              onUpdateMedication={onUpdateMedication}
              onRemoveMedication={onRemoveMedication}
              onRecordAdministration={onRecordAdministration}
              searchMedications={searchMedications}
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
              onGenerateInvoice={onGenerateInvoice}
              onSaveClinicalNotes={onSaveClinicalNotes}
              onInvoicePaid={onInvoicePaid}
              onInvoiceRecovered={onInvoiceRecovered}
              getBedPrice={getBedPrice}
            />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default PatientWorkspace;
