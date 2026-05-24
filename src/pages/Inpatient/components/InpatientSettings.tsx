import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  Bed,
  Building2,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Pencil,
  Check,
  X,
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
import { useTenant } from "@/src/context/TenantContext";
import UpgradeSubscriptionModal from "@/src/components/UpgradeSubscriptionModal";
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
  onDeleteWard,
}: {
  open: boolean;
  onClose: () => void;
  wardConfiguration: WardConfig[];
  onUpdateWardConfig: (wardId: string, updates: Partial<WardConfig>) => void;
  onUpdateBedStatus: (wardId: string, bedCode: string, status: BedUnit["status"]) => void;
  onAddWard: (ward: Omit<WardConfig, "beds"> & { bedCount: number }) => void;
  onDeleteWard: (wardId: string) => void;
}) => {
  const [drillDownWard, setDrillDownWard] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWard, setEditingWard] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showBedUpgradeModal, setShowBedUpgradeModal] = useState(false);
  const [bedUpgradeMessage, setBedUpgradeMessage] = useState("");
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editingBedPrice, setEditingBedPrice] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTotalBeds, setEditTotalBeds] = useState<number | null>(null);
  const [newWard, setNewWard] = useState({
    wardId: "",
    name: "",
    department: "",
    bedCount: 10,
  });

  const { tenant } = useTenant();
  const maxBedCapacity = tenant?.maxBedCapacity ?? 0;

  const selectedWard = wardConfiguration.find(
    (w) => w.wardId === drillDownWard
  );
  const occupancyRate = (ward: WardConfig) => {
    const occupied = ward.beds.filter((b) => b.status === "Occupied").length;
    const total = ward.beds.length;
    return total > 0 ? Math.round((occupied / total) * 100) : 0;
  };

  const handleAddWard = () => {
    if (!newWard.wardId || !newWard.name || !newWard.department) return;
    const currentBeds = wardConfiguration.reduce((sum, w) => sum + w.beds.length, 0);
    const totalBedsAfter = currentBeds + newWard.bedCount;
    if (totalBedsAfter > maxBedCapacity) {
      setBedUpgradeMessage(
        `Cannot add ${newWard.bedCount} beds. Your plan allows ${maxBedCapacity} beds (currently ${currentBeds}).`
      );
      setShowBedUpgradeModal(true);
      return;
    }
    onAddWard(newWard);
    setNewWard({ wardId: "", name: "", department: "", bedCount: 10 });
    setShowAddForm(false);
  };

  const startEditing = (ward: WardConfig) => {
    setEditingWard(ward.wardId);
    setEditName(ward.name);
    setEditDept(ward.department);
    setEditTotalBeds(ward.totalBeds);
  };

  const saveEdit = () => {
    if (!editingWard || !editName.trim() || !editDept.trim()) return;
    const ward = wardConfiguration.find((w) => w.wardId === editingWard);
    if (ward && editTotalBeds && editTotalBeds > ward.beds.length) {
      const currentBeds = wardConfiguration.reduce((sum, w) => sum + w.beds.length, 0);
      const addedBeds = editTotalBeds - ward.beds.length;
      if (currentBeds + addedBeds > maxBedCapacity) {
        setBedUpgradeMessage(
          `Cannot add ${addedBeds} beds. Your plan allows ${maxBedCapacity} beds (currently ${currentBeds}).`
        );
        setShowBedUpgradeModal(true);
        return;
      }
    }
    onUpdateWardConfig(editingWard, {
      name: editName.trim(),
      department: editDept.trim(),
      totalBeds: editTotalBeds ?? undefined,
    });
    setEditingWard(null);
  };

  const cancelEdit = () => {
    setEditingWard(null);
  };

  const saveBedPrice = (wardId: string, bedCode: string) => {
    const price = parseInt(editPrice);
    if (!isNaN(price) && price > 0) {
      const ward = wardConfiguration.find((w) => w.wardId === wardId);
      if (ward) {
        const updatedBeds = ward.beds.map((b) =>
          b.bedCode === bedCode ? { ...b, price } : b
        );
        onUpdateWardConfig(wardId, { beds: updatedBeds });
      }
    }
    setEditingBedPrice(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
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
            <DialogTitle className="text-base">
              {drillDownWard
                ? selectedWard?.name ?? "Ward Details"
                : "Inpatient Settings"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
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
                              Ward Type
                            </Label>
                            <Select
                              value={newWard.department}
                              onValueChange={(val) =>
                                setNewWard((p) => ({ ...p, department: val }))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select ward type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {["General", "Semi-Private", "Private", "ICU", "Emergency"].map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

                {wardConfiguration.length === 0 && !showAddForm ? (
                  <div className="text-center py-16">
                    <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      No wards configured
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Add New Ward" above to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {wardConfiguration.map((ward) => (
                      <div
                        key={ward.wardId}
                        className="group"
                      >
                        {editingWard === ward.wardId ? (
                          <div className="p-4 rounded-xl border-2 border-sky-300 bg-sky-50 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-500">
                                  Ward Name
                                </Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-500">
                                  Department
                                </Label>
                                <Input
                                  value={editDept}
                                  onChange={(e) => setEditDept(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-500">
                                  Total Beds
                                </Label>
                                <Input
                                  value={editTotalBeds ?? ""}
                                  onChange={(e) =>
                                    setEditTotalBeds(parseInt(e.target.value) || 0)
                                  }
                                  type="number"
                                  min={1}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="text-xs h-7 gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                className="text-xs h-7 gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all">
                            <button
                              onClick={() => setDrillDownWard(ward.wardId)}
                              className="flex items-center gap-4 flex-1 min-w-0 text-left"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
                                <Building2 className="w-5 h-5 text-slate-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {ward.name}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {ward.department} &middot; {ward.beds.length} beds
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
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(ward)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-100"
                                title="Edit ward"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(ward.wardId)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete ward"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setDrillDownWard(null);
                            startEditing(selectedWard);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-100"
                          title="Edit ward"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(selectedWard.wardId)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete ward"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                      <div className="flex items-center justify-between px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        <span className="w-32">Bed</span>
                        <span className="w-24 text-center">Status</span>
                        <span className="w-24 text-right">Price / Day</span>
                      </div>
                      {selectedWard.beds.map((bed) => (
                        <div
                          key={bed.bedCode}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                        >
                          <div className="flex items-center gap-3 w-32">
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
                          <div className="w-32 text-right">
                            {editingBedPrice === bed.bedCode ? (
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-xs text-slate-400">₦</span>
                                <Input
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  type="number"
                                  className="h-7 w-28 text-xs font-mono"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      saveBedPrice(selectedWard.wardId, bed.bedCode);
                                    if (e.key === "Escape")
                                      setEditingBedPrice(null);
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    saveBedPrice(selectedWard.wardId, bed.bedCode)
                                  }
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingBedPrice(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingBedPrice(bed.bedCode);
                                  setEditPrice(String(bed.price));
                                }}
                                className="flex items-center gap-1 ml-auto text-xs font-mono font-bold text-slate-700 hover:text-sky-600"
                              >
                                <span className="text-xs text-slate-400">₦</span>
                                {bed.price.toLocaleString()}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>

        <UpgradeSubscriptionModal
          open={showBedUpgradeModal}
          onOpenChange={setShowBedUpgradeModal}
          resourceType="beds"
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
        >
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                Delete Ward
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 pt-2">
                Are you sure you want to delete{" "}
                <strong>
                  {wardConfiguration.find((w) => w.wardId === deleteConfirm)
                    ?.name ?? "this ward"}
                </strong>
                ? This action cannot be undone. All beds and associated
                admissions will be removed from the local configuration.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm) onDeleteWard(deleteConfirm);
                  setDeleteConfirm(null);
                  setDrillDownWard(null);
                }}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Ward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default InpatientSettings;
