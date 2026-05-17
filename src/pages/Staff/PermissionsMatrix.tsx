import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStaff } from "./StaffContext";
import { PERMISSION_TREE } from "./data";
import type { StaffRecord, StaffPermissions } from "./types";

interface Props {
  staff: StaffRecord;
}

export default function PermissionsMatrix({ staff }: Props) {
  const { updatePermissions } = useStaff();
  const [pendingPerms, setPendingPerms] = useState<
    Record<string, StaffPermissions>
  >(staff.permissions);
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(PERMISSION_TREE).forEach((key) => {
      initial[key] = true;
    });
    return initial;
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPendingPerms(staff.permissions);
  }, [staff.staff_id, staff.permissions]);

  const hasChanges = useMemo(
    () => JSON.stringify(pendingPerms) !== JSON.stringify(staff.permissions),
    [pendingPerms, staff.permissions]
  );

  const handleParentToggle = (moduleKey: string) => {
    setPendingPerms((prev) => {
      const current = prev[moduleKey];
      const newEnabled = !current.enabled;
      const allChildKeys = PERMISSION_TREE[moduleKey].children.map(
        (c) => c.key
      );
      return {
        ...prev,
        [moduleKey]: {
          enabled: newEnabled,
          views: newEnabled ? allChildKeys : [],
        },
      };
    });
  };

  const handleChildToggle = (moduleKey: string, childKey: string) => {
    setPendingPerms((prev) => {
      const current = prev[moduleKey];
      const newViews = current.views.includes(childKey)
        ? current.views.filter((v) => v !== childKey)
        : [...current.views, childKey];
      return {
        ...prev,
        [moduleKey]: {
          enabled: newViews.length > 0,
          views: newViews,
        },
      };
    });
  };

  const handleSave = () => {
    updatePermissions(staff.staff_id, pendingPerms);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(PERMISSION_TREE).map(([moduleKey, module]) => {
          const perm = pendingPerms[moduleKey];
          const isExpanded = expandedModules[moduleKey];
          const allChildKeys = module.children.map((c) => c.key);
          const allChecked = allChildKeys.every((k) =>
            perm?.views?.includes(k)
          );
          const someChecked = allChildKeys.some((k) =>
            perm?.views?.includes(k)
          );

          return (
            <div
              key={moduleKey}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              {/* Parent Row */}
              <button
                onClick={() =>
                  setExpandedModules((prev) => ({
                    ...prev,
                    [moduleKey]: !prev[moduleKey],
                  }))
                }
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParentToggle(moduleKey);
                  }}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    perm?.enabled
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "border-slate-300"
                  )}
                >
                  {perm?.enabled && <Check className="w-3 h-3" />}
                </button>
                <span className="flex-1 text-sm font-semibold text-slate-800">
                  {module.label}
                </span>
                <span className="text-xs text-slate-400">
                  {perm?.views?.length || 0}/{allChildKeys.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Child Rows */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="children"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-2 space-y-1">
                      {module.children.map((child) => (
                        <label
                          key={child.key}
                          className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <button
                            onClick={() =>
                              handleChildToggle(moduleKey, child.key)
                            }
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                              perm?.views?.includes(child.key)
                                ? "bg-sky-600 border-sky-600 text-white"
                                : "border-slate-300"
                            )}
                          >
                            {perm?.views?.includes(child.key) && (
                              <Check className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <span className="text-sm text-slate-700">
                            {child.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Save Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {hasChanges
            ? "You have unsaved permission changes"
            : "All permissions are up to date"}
        </span>
        <Button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          size="sm"
          className={cn(
            "gap-2 transition-colors",
            saved
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-sky-600 hover:bg-sky-700"
          )}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
