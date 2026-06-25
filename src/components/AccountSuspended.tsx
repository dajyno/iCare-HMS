import React from "react";
import { AlertTriangle } from "lucide-react";

interface AccountSuspendedProps {
  hospitalName?: string;
}

const AccountSuspended: React.FC<AccountSuspendedProps> = ({ hospitalName }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Suspended</h1>
      <p className="text-slate-500 text-sm mb-4">
        {hospitalName ? (
          <>The workspace for <strong>{hospitalName}</strong> has been suspended.</>
        ) : (
          <>This hospital workspace has been suspended.</>
        )}
      </p>
      <p className="text-slate-400 text-xs">
        Please contact iCare support at <strong>support@icare.ng</strong> for assistance.
      </p>
    </div>
  </div>
);


export default AccountSuspended;
