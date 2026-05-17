import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Droplets, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  ActiveAdmission,
  FluidEntry,
} from "../inpatientTypes";

const FluidCard = ({
  entry,
  type,
  onRemove,
}: {
  entry: FluidEntry;
  type: "intake" | "output";
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow transition-all">
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        type === "intake"
          ? "bg-sky-100 text-sky-600"
          : "bg-amber-100 text-amber-600"
      )}
    >
      <Droplets className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-900 truncate">
        {entry.source}
      </p>
      <p className="text-[10px] text-slate-400 font-mono">
        {new Date(entry.timestamp).toLocaleString()}
      </p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-bold font-mono text-slate-900">
        {entry.volume} ml
      </p>
    </div>
    <button
      onClick={onRemove}
      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const AddFluidForm = ({
  type,
  onAdd,
}: {
  type: "intake" | "output";
  onAdd: (source: string, volume: number) => void;
}) => {
  const [source, setSource] = useState("");
  const [volume, setVolume] = useState("");

  const handleSubmit = () => {
    if (!source.trim() || !volume) return;
    onAdd(source.trim(), parseInt(volume));
    setSource("");
    setVolume("");
  };

  const suggestions =
    type === "intake"
      ? ["IV Saline", "IV Ringer's Lactate", "Oral Water", "Blood Transfusion", "NG Feed"]
      : ["Urine Output", "Surgical Drain", "Emesis", "NG Output", "Stool"];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={`${type === "intake" ? "Intake" : "Output"} source...`}
            className="h-9 text-xs"
            list={`${type}-suggestions`}
          />
          <datalist id={`${type}-suggestions`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="w-24">
          <Input
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="ml"
            type="number"
            className="h-9 text-xs font-mono"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!source.trim() || !volume}
          className="h-9 shrink-0 gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
};

const FluidsTracking = ({
  admission,
  onRecordFluidEntry,
  fluidBalance,
}: {
  admission: ActiveAdmission;
  onRecordFluidEntry: (
    type: "intake" | "output",
    entry: Omit<FluidEntry, "itemId" | "timestamp">
  ) => void;
  fluidBalance: number;
}) => {
  const totalIntake = useMemo(
    () => admission.fluidLedger.intake.reduce((s, e) => s + e.volume, 0),
    [admission.fluidLedger.intake]
  );
  const totalOutput = useMemo(
    () => admission.fluidLedger.output.reduce((s, e) => s + e.volume, 0),
    [admission.fluidLedger.output]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Fluid Intake
            </h3>
            <span className="text-xs text-slate-400 ml-auto">
              Total: <strong className="text-sky-700 font-mono">{totalIntake} ml</strong>
            </span>
          </div>
          <div className="bg-sky-50/50 rounded-xl border border-sky-200 p-3 space-y-2">
            {admission.fluidLedger.intake.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No intake entries recorded
              </p>
            ) : (
              <AnimatePresence>
                {admission.fluidLedger.intake.map((entry) => (
                  <motion.div
                    key={entry.itemId}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="group"
                  >
                    <FluidCard
                      entry={entry}
                      type="intake"
                      onRemove={() => {}}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div className="pt-3 border-t border-sky-200">
              <AddFluidForm
                type="intake"
                onAdd={(source, volume) =>
                  onRecordFluidEntry("intake", { source, volume })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Fluid Output
            </h3>
            <span className="text-xs text-slate-400 ml-auto">
              Total: <strong className="text-amber-700 font-mono">{totalOutput} ml</strong>
            </span>
          </div>
          <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-3 space-y-2">
            {admission.fluidLedger.output.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No output entries recorded
              </p>
            ) : (
              <AnimatePresence>
                {admission.fluidLedger.output.map((entry) => (
                  <motion.div
                    key={entry.itemId}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="group"
                  >
                    <FluidCard
                      entry={entry}
                      type="output"
                      onRemove={() => {}}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div className="pt-3 border-t border-amber-200">
              <AddFluidForm
                type="output"
                onAdd={(source, volume) =>
                  onRecordFluidEntry("output", { source, volume })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border-2 p-6 text-center transition-colors",
          fluidBalance > 0
            ? "bg-emerald-50 border-emerald-300"
            : fluidBalance < 0
            ? "bg-red-50 border-red-300"
            : "bg-slate-50 border-slate-200"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Net Liquid Balance
        </p>
        <p
          className={cn(
            "text-4xl font-bold font-mono",
            fluidBalance > 0
              ? "text-emerald-700"
              : fluidBalance < 0
              ? "text-red-700"
              : "text-slate-600"
          )}
        >
          {fluidBalance > 0 ? "+" : ""}
          {fluidBalance} ml
        </p>
        <p className="text-xs text-slate-400 mt-2">
          <span className="text-sky-700 font-semibold">{totalIntake} ml</span> intake &minus;{" "}
          <span className="text-amber-700 font-semibold">{totalOutput} ml</span> output
        </p>
      </div>
    </div>
  );
};

export default FluidsTracking;
