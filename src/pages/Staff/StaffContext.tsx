import { createContext, useContext, useState, type ReactNode } from "react";
import type { StaffRecord, StaffPermissions } from "./types";
import { INITIAL_STAFF_RECORDS } from "./data";

interface StaffContextType {
  records: StaffRecord[];
  addRecord: (record: StaffRecord) => void;
  updateRecord: (staffId: string, updates: Partial<StaffRecord>) => void;
  updatePermissions: (
    staffId: string,
    permissions: Record<string, StaffPermissions>
  ) => void;
}

const StaffContext = createContext<StaffContextType | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<StaffRecord[]>(INITIAL_STAFF_RECORDS);

  const addRecord = (record: StaffRecord) => {
    setRecords((prev) => [...prev, record]);
  };

  const updateRecord = (staffId: string, updates: Partial<StaffRecord>) => {
    setRecords((prev) =>
      prev.map((r) => (r.staff_id === staffId ? { ...r, ...updates } : r))
    );
  };

  const updatePermissions = (
    staffId: string,
    permissions: Record<string, StaffPermissions>
  ) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.staff_id === staffId ? { ...r, permissions } : r
      )
    );
  };

  return (
    <StaffContext.Provider
      value={{ records, addRecord, updateRecord, updatePermissions }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context)
    throw new Error("useStaff must be used within StaffProvider");
  return context;
}
