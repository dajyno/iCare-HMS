import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Settings,
  Bed,
  Building2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WardConfig, BedUnit } from "../inpatientTypes";

const BED_STATUS_STYLES: Record<BedUnit["status"], string> = {
  Available: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Occupied: "bg-slate-200 text-slate-500 border-slate-300",
  "Maintenance/Sanitizing": "bg-amber-100 text-amber-700 border-amber-300",
};

const InpatientSettings = ({
  open,
  onClose,
  wardConfiguration,
  onUpdateWardConfig,
  onUpdateBedStatus,
  onAddWard,
}: {
  open: boolean;
  onClose: () => void;
  wardConfiguration: WardConfig[];
  onUpdateWardConfig: (wardId: string, updates: Partial<WardConfig>) => void;
  onUpdateBedStatus: (wardId: string, bedCode: string, status: BedUnit["status"]) => void;
  onAddWard: (ward: Omit<WardConfig, "beds"> & { bedCount: number }) => void;
}) => {
  const [drillDownWard, setDrillDownWard] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWard, setNewWard] = useState({
    wardId: "",
    name: "",
    department: "",
    bedCount: 10,
  });

  const selectedWard = wardConfiguration.find(
    (w) => w.wardId === drillDownWard
  );
  const occupancyRate = (ward: WardConfig) => {
    const occupied = ward.beds.filter((b) => b.status === "Occupied").length;
    return ward.totalBeds > 0 ? Math.round((occupied / ward.totalBeds) * 100) : 0;
  };

  const handleAddWard = () => {
    if (!newWard.wardId || !newWard.name || !newWard.department) return;
    onAddWard(newWard);
    setNewWard({ wardId: "", name: "", department: "", bedCount: 10 });
    setShowAddForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[480px] sm:w-[540px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {drillDownWard ? (
              <button
                onClick={() => setDrillDownWard(null)}
                className="p-1 -ml-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Settings className="w-5 h-5 text-slate-500" />
            )}
            <SheetTitle className="text-base">
              {drillDownWard
                ? selectedWard?.name ?? "Ward Details"
                : "Inpatient Settings"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
          <AnimatePresence mode="wait">
            {!drillDownWard ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Ward Configuration
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add New Ward
                  </Button>
                </div>

                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                        <h4 className="text-xs font-bold text-sky-800">
                          New Ward Details
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Ward ID
                            </Label>
                            <Input
                              value={newWard.wardId}
                              onChange={(e) =>
                                setNewWard((p) => ({
                                  ...p,
                                  wardId: e.target.value,
                                }))
                              }
                              placeholder="e.g. W-PED"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Ward Name
                            </Label>
                            <Input
                              value={newWard.name}
                              onChange={(e) =>
                                setNewWard((p) => ({
                                  ...p,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="e.g. Pediatrics"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Department
                            </Label>
                            <Input
                              value={newWard.department}
                              onChange={(e) =>
                                setNewWard((p) => ({
                                  ...p,
                                  department: e.target.value,
                                }))
                              }
                              placeholder="e.g. Pediatrics"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Bed Count
                            </Label>
                            <Input
                              value={newWard.bedCount}
                              onChange={(e) =>
                                setNewWard((p) => ({
                                  ...p,
                                  bedCount: parseInt(e.target.value) || 0,
                                }))
                              }
                              type="number"
                              min={1}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddForm(false)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddWard}
                            disabled={
                              !newWard.wardId ||
                              !newWard.name ||
                              !newWard.department
                            }
                            className="text-xs gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Create Ward
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  {wardConfiguration.map((ward) => (
                    <button
                      key={ward.wardId}
                      onClick={() => setDrillDownWard(ward.wardId)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
                        <Building2 className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {ward.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ward.department} &middot; {ward.totalBeds} beds
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          {occupancyRate(ward)}%
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Occupied
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {selectedWard && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {selectedWard.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {selectedWard.department} &middot;{" "}
                          {selectedWard.totalBeds} total beds
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {["Available", "Occupied", "Maintenance/Sanitizing"].map(
                        (status) => {
                          const count = selectedWard.beds.filter(
                            (b) => b.status === status
                          ).length;
                          return (
                            <div
                              key={status}
                              className={cn(
                                "rounded-xl border-2 p-3 text-center",
                                status === "Available" &&
                                  "border-emerald-200 bg-emerald-50/50",
                                status === "Occupied" &&
                                  "border-slate-200 bg-slate-50",
                                status === "Maintenance/Sanitizing" &&
                                  "border-amber-200 bg-amber-50/50"
                              )}
                            >
                              <p className="text-xl font-bold font-mono text-slate-900">
                                {count}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {status === "Maintenance/Sanitizing"
                                  ? "Maint."
                                  : status}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="space-y-1">
                      {selectedWard.beds.map((bed) => (
                        <div
                          key={bed.bedCode}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Bed className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-mono font-medium text-slate-800">
                              {bed.bedCode}
                            </span>
                          </div>
                          <Select
                            value={bed.status}
                            onValueChange={(v) =>
                              onUpdateBedStatus(
                                selectedWard.wardId,
                                bed.bedCode,
                                v as BedUnit["status"]
                              )
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "w-44 h-8 text-xs font-medium border-0",
                                BED_STATUS_STYLES[bed.status]
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Available">
                                Available
                              </SelectItem>
                              <SelectItem value="Occupied">
                                Occupied
                              </SelectItem>
                              <SelectItem value="Maintenance/Sanitizing">
                                Maintenance/Sanitizing
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InpatientSettings;
