import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pill, X, Clock, Check, AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ActiveAdmission,
  MedicationSchedule,
  AdministrationLogEntry,
} from "../inpatientTypes";

const FREQ_PRESETS: Record<
  string,
  { label: string; slots: string[] }
> = {
  OD: { label: "OD — Once Daily", slots: ["08:00"] },
  BD: { label: "BD — Twice Daily", slots: ["08:00", "20:00"] },
  TDS: { label: "TDS — Three Times Daily", slots: ["08:00", "14:00", "22:00"] },
  PRN: { label: "PRN — As Needed", slots: [] },
  Custom: { label: "Custom Hours", slots: [] },
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

const AdministrationBlock = ({
  slot,
  log,
  drugId,
  assigned,
  onSingleClick,
  onDoubleClick,
}: {
  slot: string;
  log?: AdministrationLogEntry;
  drugId: string;
  assigned: boolean;
  onSingleClick: (drugId: string, slot: string) => void;
  onDoubleClick: (drugId: string, slot: string) => void;
}) => {
  if (!assigned) {
    return <div className="w-full h-9" />;
  }
  const status = log?.status ?? "Pending";
  const styles: Record<string, string> = {
    Administered: "bg-emerald-200 text-emerald-800 border-emerald-400",
    Pending: "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200",
    Missed: "bg-red-200 text-red-800 border-red-400",
    Skipped: "bg-orange-200 text-orange-800 border-orange-400",
  };
  return (
    <button
      onClick={() => onSingleClick(drugId, slot)}
      onDoubleClick={() => onDoubleClick(drugId, slot)}
      className={cn(
        "w-full h-9 rounded-md border text-[10px] font-bold tracking-tight transition-all cursor-pointer flex items-center justify-center",
        styles[status]
      )}
      title={`${slot} — ${status}`}
    >
      {slot}
    </button>
  );
};

const TimeAllocator = ({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (hour: string) => void;
}) => (
  <div className="grid grid-cols-8 gap-1">
    {HOURS.map((h) => (
      <button
        key={h}
        type="button"
        onClick={() => onToggle(h)}
        className={cn(
          "py-1.5 rounded text-[10px] font-mono font-bold border transition-all",
          selected.includes(h)
            ? "bg-sky-600 text-white border-sky-600"
            : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
        )}
      >
        {h}
      </button>
    ))}
  </div>
);

const MedicationMAR = ({
  admission,
  onAssignMedication,
  onUpdateMedication,
  onRemoveMedication,
  onRecordAdministration,
  searchMedications,
}: {
  admission: ActiveAdmission;
  onAssignMedication: (med: MedicationSchedule) => void;
  onUpdateMedication: (drugId: string, med: MedicationSchedule) => void;
  onRemoveMedication: (drugId: string) => void;
  onRecordAdministration: (
    drugId: string,
    slot: string,
    status: "Administered" | "Missed" | "Skipped",
    note: string
  ) => void;
  searchMedications: (query: string) => Promise<{ drugId: string; name: string }[]>;
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDrugId, setEditingDrugId] = useState<string | null>(null);
  const [drugQuery, setDrugQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ drugId: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<{
    drugId: string;
    name: string;
  } | null>(null);
  const [freq, setFreq] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(150);
  const [customSlots, setCustomSlots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [verifyDialog, setVerifyDialog] = useState<{
    drugId: string;
    slot: string;
  } | null>(null);
  const [verifyNote, setVerifyNote] = useState("");

  const allSlots =
    freq === "Custom" ? customSlots : FREQ_PRESETS[freq]?.slots ?? [];

  useEffect(() => {
    if (!drugQuery.trim() || selectedDrug) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchMedications(drugQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [drugQuery, selectedDrug, searchMedications]);

  const openNewDialog = () => {
    setEditingDrugId(null);
    setDrugQuery("");
    setSelectedDrug(null);
    setFreq("");
    setQuantity(1);
    setUnitPrice(150);
    setCustomSlots([]);
    setSearchResults([]);
    setDrawerOpen(true);
  };

  const openEditDialog = (med: MedicationSchedule) => {
    setEditingDrugId(med.scheduleEntryId || med.drugId);
    setSelectedDrug({ drugId: med.drugId, name: med.name });
    setDrugQuery(med.name);
    setFreq(med.frequency);
    setQuantity(med.quantity || 1);
    setUnitPrice(med.unitPrice || 150);
    if (med.frequency === "Custom") {
      setCustomSlots(med.assignedSlots);
    } else {
      setCustomSlots([]);
    }
    setSearchResults([]);
    setDrawerOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!selectedDrug || !freq || saving) return;
    setSaving(true);
    try {
      const slots =
        freq === "Custom" ? customSlots : FREQ_PRESETS[freq]?.slots ?? [];
      const drugId = selectedDrug.drugId;
      const existingEntry = editingDrugId
        ? admission.medicationSchedule.find((m) =>
            m.drugId === editingDrugId || m.scheduleEntryId === editingDrugId
          )
        : undefined;
      const med: MedicationSchedule = {
        scheduleEntryId: existingEntry?.scheduleEntryId || crypto.randomUUID(),
        drugId,
        name: selectedDrug.name,
        quantity: quantity || 1,
        unitPrice: unitPrice || 150,
        frequency: freq as MedicationSchedule["frequency"],
        assignedSlots: slots,
        administrationLog: slots.map((s) => {
          if (editingDrugId === drugId) {
            const existing = admission.medicationSchedule
              .find((m) => m.drugId === drugId)
              ?.administrationLog.find((l) => l.slot === s);
            return existing ?? { slot: s, status: "Pending" as const, loggedAt: null, note: "" };
          }
          return { slot: s, status: "Pending" as const, loggedAt: null, note: "" };
        }),
      };
      if (editingDrugId) {
        onUpdateMedication(editingDrugId, med);
      } else {
        onAssignMedication(med);
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSingleClick = useCallback(
    (drugId: string, slot: string) => {
      const med = admission.medicationSchedule.find(
        (m) => m.drugId === drugId
      );
      const log = med?.administrationLog.find((l) => l.slot === slot);
      if (log?.status === "Administered") {
        onRecordAdministration(drugId, slot, "Missed", "Reverted from Administered");
      } else if (log?.status === "Pending" || !log) {
        onRecordAdministration(drugId, slot, "Administered", "");
      }
    },
    [admission.medicationSchedule, onRecordAdministration]
  );

  const handleDoubleClick = useCallback(
    (drugId: string, slot: string) => {
      setVerifyDialog({ drugId, slot });
      setVerifyNote("");
    },
    []
  );

  const handleVerifySubmit = () => {
    if (!verifyDialog) return;
    onRecordAdministration(
      verifyDialog.drugId,
      verifyDialog.slot,
      "Missed",
      verifyNote
    );
    setVerifyDialog(null);
    setVerifyNote("");
  };

  const handleDeleteMedication = useCallback(
    (drugId: string) => {
      onRemoveMedication(drugId);
    },
    [onRemoveMedication]
  );

  const meds = admission.medicationSchedule;
  const allSlotsOrdered = useMemo(
    () =>
      Array.from(new Set(meds.flatMap((m) => m.assignedSlots))).sort(),
    [meds]
  );

  return (
    <>
      {meds.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Pill className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">
            No Medications Scheduled
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click "+ Assign Medication" to build a regimen
          </p>
          <Button
            size="sm"
            onClick={openNewDialog}
            className="mt-4 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Assign Medication
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              MAR — Medication Administration Record
            </h3>
            <Button
              size="sm"
              onClick={openNewDialog}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign Medication
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-48">
                    Medication
                  </th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-12">
                    Qty
                  </th>
                  {allSlotsOrdered.map((slot) => (
                    <th
                      key={slot}
                      className="px-1.5 py-2.5 text-center text-[10px] font-semibold text-slate-500 w-14"
                    >
                      {slot}
                    </th>
                  ))}
                  <th className="text-center px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {meds.map((med) => (
                  <tr key={med.scheduleEntryId || med.drugId} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium text-slate-900">
                        {med.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {med.frequency}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-700">
                      {med.quantity}
                    </td>
                    {allSlotsOrdered.map((slot) => {
                      const log = med.administrationLog.find(
                        (l) => l.slot === slot
                      );
                      const assigned = med.assignedSlots.includes(slot);
                      return (
                        <td key={slot} className="px-1 py-1.5">
                          <AdministrationBlock
                            slot={slot}
                            log={log}
                            drugId={med.drugId}
                            assigned={assigned}
                            onSingleClick={handleSingleClick}
                            onDoubleClick={handleDoubleClick}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditDialog(med)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-sky-600 transition-colors"
                          title="Edit medication"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedication(med.drugId)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Pill className="w-4 h-4" />
              {editingDrugId ? "Edit Medication" : "Assign Medication"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Drug</Label>
              <div className="relative">
                <Input
                  value={drugQuery}
                  onChange={(e) => setDrugQuery(e.target.value)}
                  placeholder="Search medication..."
                  className="h-9 text-sm"
                />
                {drugQuery && !selectedDrug && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400 text-center">
                        No medications found
                      </div>
                    ) : (
                      searchResults.map((m) => (
                        <button
                          key={m.drugId}
                          onClick={() => {
                            setSelectedDrug(m);
                            setDrugQuery(m.name);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50"
                        >
                          {m.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedDrug && (
                <div className="flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded">
                  <Check className="w-3 h-3" />
                  {selectedDrug.name}
                  <button
                    onClick={() => {
                      setSelectedDrug(null);
                      setDrugQuery("");
                    }}
                    className="ml-auto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Unit Price (₦)</Label>
                <Input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Frequency Preset</Label>
                <Select value={freq} onValueChange={setFreq}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQ_PRESETS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AnimatePresence>
              {freq === "Custom" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Time Allocator — Click hours to toggle
                  </Label>
                  <TimeAllocator
                    selected={customSlots}
                    onToggle={(h) =>
                      setCustomSlots((prev) =>
                        prev.includes(h)
                          ? prev.filter((s) => s !== h)
                          : [...prev, h].sort()
                      )
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {freq && freq !== "Custom" && (
              <div className="flex flex-wrap gap-1.5">
                {FREQ_PRESETS[freq].slots.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 bg-sky-50 text-sky-700 text-xs font-mono font-bold rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDrawerOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedDrug || !freq || saving}
              onClick={handleSaveSchedule}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : editingDrugId ? "Update Schedule" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!verifyDialog}
        onOpenChange={(o) => !o && setVerifyDialog(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Missed / Skipped Medication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Confirm medication was not administered for slot{" "}
              <strong>{verifyDialog?.slot}</strong>. A clinical note is
              required.
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Clinical Note <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Reason for missed/skipped dose..."
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVerifyDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!verifyNote.trim()}
              onClick={handleVerifySubmit}
              variant="destructive"
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Missed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MedicationMAR;
