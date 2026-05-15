import { motion } from "motion/react";

const statusConfig: Record<string, { label: string; bg: string; text: string; glow: string }> = {
  "To Do": {
    label: "To Do",
    bg: "bg-purple-50",
    text: "text-purple-700",
    glow: "rgba(168,85,247,0.35)",
  },
  "In Progress": {
    label: "In Progress",
    bg: "bg-amber-50",
    text: "text-amber-700",
    glow: "rgba(245,158,11,0.35)",
  },
  "Waiting for Results": {
    label: "Waiting for Results",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    glow: "rgba(16,185,129,0.35)",
  },
  Done: {
    label: "Done",
    bg: "bg-blue-50",
    text: "text-blue-700",
    glow: "rgba(59,130,246,0.35)",
  },
  Failed: {
    label: "Failed",
    bg: "bg-red-50",
    text: "text-red-700",
    glow: "rgba(239,68,68,0.35)",
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] ?? statusConfig["To Do"];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${config.bg} ${config.text}`}
      style={{ boxShadow: `0 0 10px ${config.glow}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.glow.replace("0.35", "1") }}
      />
      {config.label}
    </motion.span>
  );
};

export default StatusBadge;
