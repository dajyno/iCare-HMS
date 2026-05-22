import React from "react";
import { LockKeyhole } from "lucide-react";
import { TIER_REQUIRED_FOR_MODULE } from "../lib/moduleAccess";

interface ModuleLockedPageProps {
  moduleName: string;
}

const MODULE_LABELS: Record<string, string> = {
  emr: "EMR",
  reception: "Reception",
  billing: "Billing",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  hmo_insurance: "HMO Insurance",
  multi_branch: "Multi-Branch",
  human_resources: "HR",
  accounting: "Accounting",
};

const ModuleLockedPage: React.FC<ModuleLockedPageProps> = ({ moduleName }) => {
  const label = MODULE_LABELS[moduleName] || moduleName;
  const requiredTier = TIER_REQUIRED_FOR_MODULE[moduleName] || "an upgraded license";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockKeyhole className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Module Locked</h1>
        <p className="text-slate-500 text-sm mb-4">
          The <strong>{label}</strong> engine requires a{" "}
          <strong>{requiredTier}</strong> license.
        </p>
        <p className="text-slate-400 text-xs">
          Please contact your administrator to upgrade your subscription plan.
        </p>
      </div>
    </div>
  );
};

export default ModuleLockedPage;
