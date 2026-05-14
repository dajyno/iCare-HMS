import { Scan } from "lucide-react";

const RadiologyPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Scan className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Radiology</h1>
          <p className="text-sm text-slate-500">Imaging and radiology services</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-slate-400">
        <Scan className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>Radiology module coming soon.</p>
      </div>
    </div>
  );
};

export default RadiologyPage;
