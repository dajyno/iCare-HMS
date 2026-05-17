import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Heart, Thermometer, Droplets, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VitalsRecord, ActiveAdmission } from "../inpatientTypes";

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return null;
  const width = 80;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    )
    .join(" ");
  return (
    <svg width={width} height={height} className="inline-block ml-2 shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const JournalEntry = ({
  entry,
  type,
}: {
  entry: any;
  type: "admission" | "vitals" | "medication" | "lab" | "fluid" | "clinical_note";
}) => {
  const icons: Record<string, any> = {
    admission: Activity,
    vitals: Heart,
    medication: Droplets,
    lab: Activity,
    fluid: Droplets,
    clinical_note: StickyNote,
  };
  const Icon = icons[type] || Activity;
  const colors: Record<string, string> = {
    admission: "bg-blue-100 text-blue-600",
    vitals: "bg-green-100 text-green-600",
    medication: "bg-amber-100 text-amber-600",
    lab: "bg-purple-100 text-purple-600",
    fluid: "bg-cyan-100 text-cyan-600",
    clinical_note: "bg-violet-100 text-violet-600",
  };
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full ${colors[type]} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-slate-200 group-last:hidden" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-sm text-slate-900">{entry.title}</p>
        {entry.description && (
          <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
        )}
        <p className="text-[10px] text-slate-400 font-mono mt-1">
          {entry.timestamp}
        </p>
      </div>
    </div>
  );
};

const JournalVitalsFeed = ({
  admission,
  onCommitVitals,
  onSaveClinicalNotes,
}: {
  admission: ActiveAdmission;
  onCommitVitals: (vitals: Omit<VitalsRecord, "timestamp">) => void;
  onSaveClinicalNotes?: (notes: string) => void;
}) => {
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpO2] = useState("");
  const [observations, setObservations] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(admission.clinicalNotes || "");
  const bottomRef = useRef<HTMLDivElement>(null);

  const journal = useMemo(() => {
    const entries: any[] = [
      {
        type: "admission",
        title: `Admitted to ${admission.wardCode} / ${admission.bedNo}`,
        description: `Attending: ${admission.attendingPhysician}`,
        timestamp: `${admission.daysAdmitted} days ago`,
      },
    ];
    admission.vitalsHistory.forEach((v) => {
      const desc = v.observations ? `Observations: ${v.observations}` : undefined;
      entries.push({
        type: "vitals",
        title: `BP ${v.bp}, Pulse ${v.pulse}, Temp ${v.temp}°C, SpO2 ${v.spo2}%`,
        description: desc,
        timestamp: new Date(v.timestamp).toLocaleString(),
      });
    });
    admission.medicationSchedule.forEach((m) => {
      m.administrationLog
        .filter((l) => l.status === "Administered" && l.loggedAt)
        .forEach((l) => {
          entries.push({
            type: "medication",
            title: `${m.name} administered`,
            description: `Slot: ${l.slot}`,
            timestamp: l.loggedAt
              ? new Date(l.loggedAt).toLocaleString()
              : "",
          });
        });
    });
    admission.fluidLedger.intake.forEach((f) => {
      entries.push({
        type: "fluid",
        title: `Intake: ${f.volume}ml — ${f.source}`,
        timestamp: new Date(f.timestamp).toLocaleString(),
      });
    });
    admission.fluidLedger.output.forEach((f) => {
      entries.push({
        type: "fluid",
        title: `Output: ${f.volume}ml — ${f.source}`,
        timestamp: new Date(f.timestamp).toLocaleString(),
      });
    });
    entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return entries;
  }, [admission]);

  const pulseData = useMemo(
    () => admission.vitalsHistory.map((v) => v.pulse),
    [admission.vitalsHistory]
  );
  const tempData = useMemo(
    () => admission.vitalsHistory.map((v) => v.temp),
    [admission.vitalsHistory]
  );
  const spo2Data = useMemo(
    () => admission.vitalsHistory.map((v) => v.spo2),
    [admission.vitalsHistory]
  );

  const handleCommit = () => {
    if (!bp || !pulse || !temp || !spo2) return;
    onCommitVitals({
      bp,
      pulse: parseInt(pulse),
      temp: parseFloat(temp),
      spo2: parseInt(spo2),
      observations,
    });
    setBp("");
    setPulse("");
    setTemp("");
    setSpO2("");
    setObservations("");
  };

  const handleSaveNotes = () => {
    if (onSaveClinicalNotes) {
      onSaveClinicalNotes(clinicalNotes);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-white pb-4 border-b border-slate-100">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              BP (mmHg)
            </Label>
            <Input
              value={bp}
              onChange={(e) => setBp(e.target.value)}
              placeholder="120/80"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Pulse (bpm)
            </Label>
            <Input
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              placeholder="72"
              type="number"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Temp (°C)
            </Label>
            <Input
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              placeholder="36.8"
              type="number"
              step="0.1"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              SpO2 (%)
            </Label>
            <Input
              value={spo2}
              onChange={(e) => setSpO2(e.target.value)}
              placeholder="98"
              type="number"
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Observations / Notes
          </Label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Enter observations or notes for this vitals check..."
            rows={2}
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            {pulseData.length > 1 && (
              <span className="flex items-center gap-1">
                Pulse
                <Sparkline data={pulseData} color="#059669" />
              </span>
            )}
            {tempData.length > 1 && (
              <span className="flex items-center gap-1">
                Temp
                <Sparkline data={tempData} color="#dc2626" />
              </span>
            )}
            {spo2Data.length > 1 && (
              <span className="flex items-center gap-1">
                SpO2
                <Sparkline data={spo2Data} color="#2563eb" />
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={!bp || !pulse || !temp || !spo2}
            className="h-9 gap-1.5 text-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            Commit Vitals
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Clinical Notes
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveNotes}
            disabled={clinicalNotes === (admission.clinicalNotes || "")}
            className="h-7 text-xs gap-1"
          >
            <StickyNote className="w-3 h-3" />
            Save Notes
          </Button>
        </div>
        <textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Enter clinical notes for this patient..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <ScrollArea className="max-h-[400px] pr-2">
        <AnimatePresence>
          {journal.map((entry, i) => (
            <motion.div
              key={`${entry.type}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <JournalEntry entry={entry} type={entry.type} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </ScrollArea>
    </div>
  );
};

export default JournalVitalsFeed;
