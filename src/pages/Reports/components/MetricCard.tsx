import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  icon: LucideIcon;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  sky: { bg: "bg-sky-50", icon: "text-sky-600", text: "text-sky-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-700" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", text: "text-rose-700" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", text: "text-indigo-700" },
};

const TrendIcon = ({ direction }: { direction: "up" | "down" | "neutral" }) => {
  if (direction === "up") return <TrendingUp className="w-3 h-3 text-emerald-600" />;
  if (direction === "down") return <TrendingDown className="w-3 h-3 text-rose-500" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
};

export default function MetricCard({ label, value, trend, icon: Icon, color, loading, onClick }: MetricCardProps) {
  const c = colorMap[color] ?? colorMap.sky;

  if (loading) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-slate-200 animate-pulse">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-200 rounded" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-none shadow-sm ring-1 ring-slate-200 cursor-pointer",
        "hover:ring-2 hover:ring-sky-200 hover:shadow-md transition-all duration-200"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
            {trend && (
              <div className="flex items-center gap-1">
                <TrendIcon direction={trend.direction} />
                <span className={cn(
                  "text-[11px] font-medium",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-rose-500",
                  trend.direction === "neutral" && "text-slate-400"
                )}>
                  {trend.value}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", c.bg)}>
            <Icon className={cn("w-5 h-5", c.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
