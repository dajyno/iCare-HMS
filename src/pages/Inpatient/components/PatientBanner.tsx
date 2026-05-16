import { X, AlertTriangle } from "lucide-react";
import type { ActiveAdmission } from "../inpatientTypes";

const PatientBanner = ({
  admission,
  onClose,
}: {
  admission: ActiveAdmission;
  onClose: () => void;
}) => {
  const { patient } = admission;
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
          {patient.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{patient.name}</h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
            <span className="font-mono">{patient.folderNo}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Age: {patient.age}</span>
          </div>
        </div>
        {patient.allergies.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px] font-semibold text-red-700">
              Allergies: {patient.allergies.join(", ")}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PatientBanner;
