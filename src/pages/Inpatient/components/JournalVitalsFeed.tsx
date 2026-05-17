import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Heart, Thermometer, Droplets, StickyNote, User } from "lucide-react";
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
  type: "admission" | "vitals" | "medication" | "lab" | "fluid" | "observation";
}) => {
  const icons: Record<string, any> = {
    admission: Activity,
    vitals: Heart,
    medication: Droplets,
    lab: Activity,
    fluid: Droplets,
    observation: StickyNote,
  };
  const Icon = icons[type] || Activity;
  const colors: Record<string, string> = {
    admission: "bg-blue-100 text-blue-600",
    vitals: "bg-green-100 text-green-600",
    medication: "bg-amber-100 text-amber-600",
    lab: "bg-purple-100 text-purple-600",
    fluid: "bg-cyan-100 text-cyan-600",
    observation: "bg-violet-100 text-violet-600",
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
}: {
  admission: ActiveAdmission;
  onCommitVitals: (vitals: Omit<VitalsRecord, "timestamp">) => void;
}) => {
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpO2] = useState("");
  const [observations, setObservations] = useState("");
  const [staffName, setStaffName] = useState("");

  const journal = useMemo(() => {
    const entries: any[] = [
      {
        type: "admission",
        title: `Admitted to ${admission.wardCode} / ${admission.bedNo}`,
        description: `Attending: ${admission.attendingPhysician}`,
        timestamp: admission.admissionId.startsWith("ADM-")
          ? new Date(parseInt(admission.admissionId.replace("ADM-", ""))).toISOString()
          : new Date(0).toISOString(),
      },
    ];
    admission.vitalsHistory.forEach((v) => {
      const desc = v.observations ? `Obs: ${v.observations}` : undefined;
      const staff = v.observations?.match(/^Staff: (.+)$/);
      entries.push({
        type: "vitals",
        title: `BP ${v.bp}, Pulse ${v.pulse}, Temp ${v.temp}°C, SpO2 ${v.spo2}%`,
        description: desc,
        timestamp: v.timestamp,
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
            timestamp: l.loggedAt ?? "",
          });
        });
    });
    admission.fluidLedger.intake.forEach((f) => {
      entries.push({
        type: "fluid",
        title: `Intake: ${f.volume}ml — ${f.source}`,
        timestamp: f.timestamp,
      });
    });
    admission.fluidLedger.output.forEach((f) => {
      entries.push({
        type: "fluid",
        title: `Output: ${f.volume}ml — ${f.source}`,
        timestamp: f.timestamp,
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

  const handleSubmit = () => {
    const hasVitals = bp && pulse && temp && spo2;
    const hasObs = observations.trim().length > 0;
    if (!hasVitals && !hasObs) return;
    onCommitVitals({
      bp: bp || "—",
      pulse: pulse ? parseInt(pulse) : 0,
      temp: temp ? parseFloat(temp) : 0,
      spo2: spo2 ? parseInt(spo2) : 0,
      observations: staffName ? `Staff: ${staffName} — ${observations}` : observations,
    });
    setBp("");
    setPulse("");
    setTemp("");
    setSpO2("");
    setObservations("");
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-white pb-4 border-b border-slate-100">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Recording Staff
            </Label>
            <Input
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Your name..."
              className="h-8 text-xs flex-1 max-w-[240px]"
            />
          </div>
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
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Observations / Notes
            </Label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Enter observations, notes, or updates (can submit without vitals)..."
              rows={2}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>
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
            onClick={handleSubmit}
            disabled={!bp && !pulse && !temp && !spo2 && !observations.trim()}
            className="h-9 gap-1.5 text-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            Submit Record
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[500px] pr-2">
        {journal.length > 0 && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Activity Journal
          </h3>
        )}
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
      </ScrollArea>
    </div>
  );
};

export default JournalVitalsFeed;
