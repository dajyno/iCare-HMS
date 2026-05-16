import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  X,
  Bed,
  ClipboardList,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WardConfig, BedUnit } from "../inpatientTypes";

interface NewAdmissionWizardProps {
  open: boolean;
  onClose: () => void;
  wardConfiguration: WardConfig[];
  searchPatients: (query: string) => any[];
  attendingDoctors: string[];
  onFinalize: (payload: {
    patient: any;
    wardCode: string;
    bedNo: string;
    provisionalDiagnosis: string;
    chiefComplaints: string;
    attendingPhysician: string;
  }) => void;
}

const StepIndicator = ({
  step,
  total,
}: {
  step: number;
  total: number;
}) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
            i < step
              ? "bg-sky-600 text-white"
              : i === step
              ? "bg-sky-100 text-sky-700 ring-2 ring-sky-300"
              : "bg-slate-100 text-slate-400"
          )}
        >
          {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
        </div>
        {i < total - 1 && (
          <div
            className={cn(
              "w-12 h-0.5 rounded",
              i < step ? "bg-sky-600" : "bg-slate-200"
            )}
          />
        )}
      </div>
    ))}
  </div>
);

const NewAdmissionWizard = ({
  open,
  onClose,
  wardConfiguration,
  searchPatients,
  attendingDoctors,
  onFinalize,
}: NewAdmissionWizardProps) => {
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [selectedBedCode, setSelectedBedCode] = useState("");

  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const results = searchPatients(searchQuery);

  const departments = Array.from(
    new Set(wardConfiguration.map((w) => w.department))
  ).sort();

  const filteredWards = wardConfiguration.filter(
    (w) => w.department === selectedDepartment
  );

  const selectedWard = wardConfiguration.find(
    (w) => w.wardId === selectedWardId
  );
  const availableBeds = selectedWard?.beds.filter(
    (b) => b.status === "Available"
  );

  const canProceedStep1 = !!selectedPatient;
  const canProceedStep2 = !!selectedDepartment && !!selectedWardId && !!selectedBedCode;
  const canFinalize =
    provisionalDiagnosis.trim() && chiefComplaints.trim() && selectedDoctor;

  const handleClose = useCallback(() => {
    setStep(0);
    setSearchQuery("");
    setSelectedPatient(null);
    setSelectedDepartment("");
    setSelectedWardId("");
    setSelectedBedCode("");
    setProvisionalDiagnosis("");
    setChiefComplaints("");
    setSelectedDoctor("");
    setFinalizing(false);
    onClose();
  }, [onClose]);

  const handleFinalize = () => {
    if (!canFinalize || !selectedPatient) return;
    setFinalizing(true);
    setTimeout(() => {
      onFinalize({
        patient: selectedPatient,
        wardCode: selectedWardId,
        bedNo: selectedBedCode,
        provisionalDiagnosis,
        chiefComplaints,
        attendingPhysician: selectedDoctor,
      });
      setFinalizing(false);
      handleClose();
    }, 800);
  };

  const stepTitles = [
    { icon: User, label: "Patient", desc: "Find patient profile" },
    { icon: Bed, label: "Ward & Bed", desc: "Allocate bed space" },
    { icon: ClipboardList, label: "Clinical", desc: "Initial entries" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                + New Admission
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Step {step + 1} of 3 — {stepTitles[step].desc}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <StepIndicator step={step} total={3} />
        </div>

        <div className="px-6 py-4 min-h-[320px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Label className="text-sm font-semibold text-slate-700">
                  Search Patient Profile
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type patient name or folder number..."
                    className="pl-9 h-10"
                  />
                  {showDropdown && searchQuery.trim() && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                      {results.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 text-center">
                          No matching patients found
                        </div>
                      ) : (
                        results.map((p: any) => (
                          <button
                            key={p.folderNo}
                            onClick={() => {
                              setSelectedPatient(p);
                              setSearchQuery(`${p.name} (${p.folderNo})`);
                              setShowDropdown(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-sky-50 transition-colors",
                              selectedPatient?.folderNo === p.folderNo &&
                                "bg-sky-50"
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                              {p.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {p.name}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                {p.folderNo} | Age: {p.age}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 flex items-center gap-3">
                    <Check className="w-4 h-4 text-sky-600" />
                    <span className="text-sm text-sky-800">
                      Selected:{" "}
                      <strong>
                        {selectedPatient.name} ({selectedPatient.folderNo})
                      </strong>
                    </span>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    disabled={!canProceedStep1}
                    onClick={() => setStep(1)}
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">
                    Department
                  </Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(v) => {
                      setSelectedDepartment(v);
                      setSelectedWardId("");
                      setSelectedBedCode("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDepartment && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">
                      Ward
                    </Label>
                    <Select
                      value={selectedWardId}
                      onValueChange={(v) => {
                        setSelectedWardId(v);
                        setSelectedBedCode("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredWards.map((w) => (
                          <SelectItem key={w.wardId} value={w.wardId}>
                            {w.name} ({w.totalBeds} beds)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedWardId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-slate-700">
                        Select Bed
                      </Label>
                      <span className="text-xs text-slate-400">
                        {availableBeds?.length ?? 0} available
                      </span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {selectedWard?.beds.map((bed) => {
                        const isAvailable = bed.status === "Available";
                        const isSelected = selectedBedCode === bed.bedCode;
                        return (
                          <button
                            key={bed.bedCode}
                            disabled={!isAvailable}
                            onClick={() =>
                              isAvailable && setSelectedBedCode(bed.bedCode)
                            }
                            className={cn(
                              "aspect-square rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                              isSelected
                                ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-200"
                                : isAvailable
                                ? "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer"
                                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                            )}
                          >
                            <Bed className="w-3.5 h-3.5" />
                            <span className="text-[9px] leading-tight text-center mt-0.5">
                              {bed.bedCode.split("-").pop()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    disabled={!canProceedStep2}
                    onClick={() => setStep(2)}
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Provisional Diagnosis
                  </Label>
                  <Textarea
                    value={provisionalDiagnosis}
                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                    placeholder="Enter initial diagnosis..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Chief Patient Complaints
                  </Label>
                  <Textarea
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="Document primary complaints reported by patient..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Attending Physician
                  </Label>
                  <Select
                    value={selectedDoctor}
                    onValueChange={setSelectedDoctor}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign physician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {attendingDoctors.map((doc) => (
                        <SelectItem key={doc} value={doc}>
                          {doc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    disabled={!canFinalize || finalizing}
                    onClick={handleFinalize}
                    className="gap-1.5 bg-sky-600 hover:bg-sky-700"
                  >
                    {finalizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Finalize Admission
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAdmissionWizard;
