import { cn } from "@/lib/utils";
import type { CareStatus } from "../inpatientTypes";

const STATUS_STYLES: Record<CareStatus, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  "Meds Due": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    pulse: true,
  },
  "Critical Observation": {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  Stable: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const StatusBadge = ({ status }: { status: CareStatus }) => {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
        style.bg,
        style.text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot, style.pulse && "animate-pulse")} />
      {status}
    </span>
  );
};

export default StatusBadge;
