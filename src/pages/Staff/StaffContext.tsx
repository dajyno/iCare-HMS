import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getCurrentTenantId, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useTenant } from "@/src/context/TenantContext";
import type { StaffRecord } from "./types";

type StaffMutationResult = { data?: StaffRecord; error?: any };

interface StaffContextType {
  records: StaffRecord[];
  loading: boolean;
  addRecord: (record: StaffRecord) => Promise<StaffMutationResult>;
  updateRecord: (staffId: string, updates: Partial<StaffRecord>) => Promise<StaffMutationResult>;
  deleteRecord: (staffId: string) => Promise<void>;
}

const StaffContext = createContext<StaffContextType | null>(null);

function dbToStaffRecord(row: any): StaffRecord {
  return {
    staff_id: row.staff_id,
    name: row.name,
    position: row.position,
    department: row.department || "",
    availability_status: row.availability_status,
    is_clinician: row.is_clinician,
    gender: row.gender || "",
    address: row.address || "",
    email: row.email || "",
    phone: row.phone || "",
    canLogin: row.can_login,
    password: row.password || "",
    profilePicture: row.profile_picture || "",
    authUserId: row.auth_user_id || undefined,
  };
}

function staffToDb(record: Partial<StaffRecord>, tenantId?: string | null): Record<string, any> {
  const db: Record<string, any> = {};
  if (record.staff_id !== undefined) db.staff_id = record.staff_id;
  if (record.name !== undefined) db.name = record.name;
  if (record.position !== undefined) db.position = record.position;
  if (record.department !== undefined) db.department = record.department;
  if (record.availability_status !== undefined) db.availability_status = record.availability_status;
  if (record.is_clinician !== undefined) db.is_clinician = record.is_clinician;
  if (record.gender !== undefined) db.gender = record.gender;
  if (record.address !== undefined) db.address = record.address;
  if (record.email !== undefined) db.email = record.email;
  if (record.phone !== undefined) db.phone = record.phone;
  if (record.canLogin !== undefined) db.can_login = record.canLogin;
  if (record.password !== undefined) db.password = record.password;
  if (record.profilePicture !== undefined) db.profile_picture = record.profilePicture;
  if (record.authUserId !== undefined) db.auth_user_id = record.authUserId;
  if (tenantId) db.tenant_id = tenantId;
  return db;
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTenantId = tenant?.tenantId || user?.tenantId || getCurrentTenantId();

  const staffTable = () => supabase.from("staff") as any;

  const loadRecords = useCallback(async () => {
    if (!activeTenantId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await staffTable()
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load staff records:", error);
      setRecords([]);
    } else {
      setRecords((data || []).map(dbToStaffRecord));
    }
    setLoading(false);
  }, [activeTenantId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const addRecord = async (record: StaffRecord) => {
    const { data, error } = await staffTable()
      .insert(staffToDb(record, activeTenantId))
      .select("*")
      .single();

    if (error) {
      console.error("Failed to add staff record:", error);
      return { error };
    }

    const savedRecord = data ? dbToStaffRecord(data) : record;
    setRecords((prev) => [savedRecord, ...prev.filter((r) => r.staff_id !== savedRecord.staff_id)]);
    return { data: savedRecord };
  };

  const updateRecord = async (staffId: string, updates: Partial<StaffRecord>) => {
    const { data, error } = await staffTable()
      .update(staffToDb(updates, activeTenantId))
      .eq("staff_id", staffId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update staff record:", error);
      return { error };
    }

    const savedRecord = data ? dbToStaffRecord(data) : undefined;
    setRecords((prev) =>
      prev.map((r) => (r.staff_id === staffId ? savedRecord || { ...r, ...updates } : r))
    );
    return { data: savedRecord };
  };

  const deleteRecord = async (staffId: string) => {
    const { error } = await staffTable()
      .delete()
      .eq("staff_id", staffId);

    if (error) {
      console.error("Failed to delete staff record:", error);
      return;
    }
    setRecords((prev) => prev.filter((r) => r.staff_id !== staffId));
  };

  return (
    <StaffContext.Provider
      value={{
        records,
        loading,
        addRecord,
        updateRecord,
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
