import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UnreconciledDiscrepancyCardProps {
  value: number | undefined;
}

export default function UnreconciledDiscrepancyCard({ value }: UnreconciledDiscrepancyCardProps) {
  const amount = value ?? 0;
  const hasDiscrepancy = amount > 0;

  return (
    <Card className={cn("border-none shadow-sm ring-1", hasDiscrepancy ? "ring-red-200 bg-red-50/30" : "ring-slate-200")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unreconciled Discrepancies</p>
            <p className={cn("text-2xl font-extrabold tabular-nums", hasDiscrepancy ? "text-amber-700" : "text-slate-900")}>
              ₦{amount.toLocaleString()}
            </p>
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", hasDiscrepancy ? "bg-red-100" : "bg-slate-50")}>
            <AlertTriangle className={cn("w-5 h-5", hasDiscrepancy ? "text-amber-600" : "text-slate-400")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
