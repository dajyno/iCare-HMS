import { cn } from "@/lib/utils";

interface ChannelProgressBarProps {
  percentage: number;
  color: string;
  label: string;
}

export default function ChannelProgressBar({ percentage, color, label }: ChannelProgressBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">{label}</span>
        <span className="font-bold text-slate-900 tabular-nums">{percentage}%</span>
      </div>
      <div
        className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percentage}%`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
