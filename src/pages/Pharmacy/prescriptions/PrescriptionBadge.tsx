import { motion } from "motion/react";
import type { OrderStatus } from "../types";

const config: Record<OrderStatus, { label: string; text: string; bg: string; glow: string; pulse: boolean }> = {
  "New Orders": {
    label: "New Orders",
    text: "text-cyan-500",
    bg: "bg-cyan-500/8",
    glow: "rgba(6,182,212,0.45)",
    pulse: true,
  },
  "Partially Completed": {
    label: "Partially Completed",
    text: "text-amber-500",
    bg: "bg-amber-500/8",  
    glow: "rgba(245,158,11,0.35)",
    pulse: false,
  },
  "All Completed": {
    label: "All Completed",
    text: "text-emerald-500",
    bg: "bg-emerald-500/8",
    glow: "rgba(16,185,129,0.4)",
    pulse: false,
  },
};

const PrescriptionBadge = ({ status }: { status: OrderStatus }) => {
  const c = config[status] ?? config["New Orders"];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${c.bg} ${c.text} backdrop-blur-sm`}
      style={{
        boxShadow: `0 0 12px ${c.glow}`,
        border: "1px solid rgba(255,255,255,0.15)",
        ...(c.pulse ? { animation: "badgePulse 2s ease-in-out infinite" } : {}),
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: c.glow.replace("0.45", "1").replace("0.35", "1").replace("0.4", "1") }}
      />
      {c.label}
    </motion.span>
  );
};

export default PrescriptionBadge;
