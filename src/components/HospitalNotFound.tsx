import React from "react";

const HospitalNotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl font-bold text-slate-300">?</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Hospital Workspace Not Found</h1>
      <p className="text-slate-500 text-sm">
        The hospital workspace you're looking for doesn't exist or has been removed.
        Please check the URL or contact your system administrator.
      </p>
    </div>
  </div>
);

export default HospitalNotFound;
