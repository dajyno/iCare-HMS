import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ChannelProgressBar from "./ChannelProgressBar";
import type { PaymentChannel } from "../types";

interface PaymentChannelSplitProps {
  channels: PaymentChannel[] | undefined;
  loading: boolean;
}

const CHANNEL_COLORS: Record<string, string> = {
  POS: "bg-blue-500",
  Transfer: "bg-purple-500",
  Cash: "bg-emerald-500",
  HMO: "bg-amber-400",
};

export default function PaymentChannelSplit({ channels, loading }: PaymentChannelSplitProps) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200">
      <CardHeader className="px-5 pt-5 pb-0">
        <CardTitle className="text-base font-bold text-slate-900">Payment Channel Split</CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Method breakdown by volume</p>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))
        ) : !channels || channels.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-4">No channel data available.</p>
        ) : (
          <>
            {channels.map((channel) => (
              <div key={channel.method} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{channel.method}</span>
                  <span className="text-xs text-slate-400 tabular-nums">₦{channel.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ChannelProgressBar
                      percentage={channel.percentage}
                      color={CHANNEL_COLORS[channel.method] ?? "bg-slate-400"}
                      label={channel.method}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 tabular-nums w-10 text-right">
                    {channel.percentage}%
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  ₦{(channels.reduce((sum, c) => sum + c.amount, 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
