import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { StaffRecord, StaffPermissions } from "./types";
import { INITIAL_STAFF_RECORDS } from "./data";

const STORAGE_KEY = "icare-staff-records";

function loadPersistedRecords(): StaffRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaffRecord[];
  } catch {
    /* corrupted data – ignore */
  }
  return INITIAL_STAFF_RECORDS;
}

interface StaffContextType {
  records: StaffRecord[];
  addRecord: (record: StaffRecord) => void;
  updateRecord: (staffId: string, updates: Partial<StaffRecord>) => void;
  updatePermissions: (
    staffId: string,
    permissions: Record<string, StaffPermissions>
  ) => void;
  deleteRecord: (staffId: string) => void;
}

const StaffContext = createContext<StaffContextType | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<StaffRecord[]>(loadPersistedRecords);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

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

  const deleteRecord = (staffId: string) => {
    setRecords((prev) => prev.filter((r) => r.staff_id !== staffId));
  };

  return (
    <StaffContext.Provider
      value={{
        records,
        addRecord,
        updateRecord,
        updatePermissions,
        deleteRecord,
      }}
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
