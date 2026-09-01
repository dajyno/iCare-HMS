import { motion } from "motion/react";

interface ChipGridProps {
  key?: string | number;
  label: string;
  sublabel?: string;
  selected: boolean;
  onToggle: () => void;
}

const ChipGrid = ({ label, sublabel, selected, onToggle }: ChipGridProps) => {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      layout
      className={`relative w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
        selected
          ? "text-white border-[#005EB8]"
          : "text-slate-700 border-slate-200 hover:border-slate-300 bg-white"
      }`}
      style={
        selected
          ? {
              background:
                "linear-gradient(135deg, #005EB8 0%, #0077e6 100%)",
              boxShadow:
                "inset 0 1px 2px rgba(255,255,255,0.2), 0 0 8px rgba(0,94,184,0.25)",
            }
          : { background: "#fafbfc" }
      }
      whileTap={{ scale: 0.97 }}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80"
        />
      )}
      <span className="pr-5">{label}</span>
      {sublabel && (
        <motion.span
          layout
          className={`text-[10px] font-semibold tabular-nums shrink-0 ${
            selected ? "text-white/80" : "text-slate-400"
          }`}
        >
          {sublabel}
        </motion.span>
      )}
    </motion.button>
  );
};

export default ChipGrid;
