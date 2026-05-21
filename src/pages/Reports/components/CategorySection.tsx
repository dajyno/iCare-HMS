import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  children: ReactNode;
}

const colorMap: Record<string, { bg: string; text: string; line: string }> = {
  sky: { bg: "bg-sky-50", text: "text-sky-700", line: "bg-sky-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", line: "bg-violet-500" },
};

export default function CategorySection({ icon: Icon, title, description, color, children }: CategorySectionProps) {
  const c = colorMap[color] ?? colorMap.sky;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className={cn("flex-1 h-px ml-4", c.line)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {children}
      </div>
    </div>
  );
}
