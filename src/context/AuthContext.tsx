import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, toCamel } from "../lib/supabase";
import { adminSupabase } from "../lib/adminSupabase";
import type { StaffRecord } from "../pages/Staff/types";
import { getCustomAccounts } from "../lib/accountsStore";
import type { User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const DEFAULT_ACCOUNTS: Record<string, { name: string; role: string }> = {
  "admin@icare.com": { name: "Super Admin", role: "SuperAdmin" },
  "alice@icare.com": { name: "Dr. Alice Smith", role: "Doctor" },
  "bob@icare.com": { name: "Dr. Bob Wilson", role: "Doctor" },
  "jane@icare.com": { name: "Nurse Jane", role: "Nurse" },
  "sam@icare.com": { name: "Sam Lab", role: "LabTechnician" },
  "phil@icare.com": { name: "Phil Pharmacist", role: "Pharmacist" },
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, authUser?: { email?: string; user_metadata?: { full_name?: string; role?: string } }) => {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data && !error) {
      setUser(toCamel(data) as unknown as User);
    } else if (authUser) {
      const { data: staffRow } = await (supabase.from("staff") as any)
        .select("name, position")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (staffRow) {
        const role = (staffRow.position === "Medical Doctors" ? "Doctor" :
          staffRow.position === "Nursing" ? "Nurse" :
          staffRow.position === "Pharmacy" ? "Pharmacist" :
          staffRow.position === "Laboratory" ? "LabTechnician" :
          "HospitalAdmin") as User["role"];
        setUser({
          id: userId,
          email: authUser.email || "",
          full_name: staffRow.name || authUser.email?.split("@")[0] || "User",
          role,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        const role = (authUser.user_metadata?.role || "Doctor") as User["role"];
        setUser({
          id: userId,
          email: authUser.email || "",
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string, tenantId?: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    const handlePostAuth = async (userId: string, authUser: any) => {
      if (tenantId) {
        const { data: profile } = await adminSupabase
          .from("users")
          .select("tenant_id")
          .eq("id", userId)
          .maybeSingle();

        if (profile && profile.tenant_id && profile.tenant_id !== tenantId) {
          await supabase.auth.signOut();
          throw new Error("Invalid credentials for this workspace");
        }

        if (profile && !profile.tenant_id) {
          await adminSupabase
            .from("users")
            .update({ tenant_id: tenantId })
            .eq("id", userId);
        }
      }

      await fetchProfile(userId, authUser);
    };

    if (error?.message?.includes("Invalid login credentials")) {
      let account = { ...DEFAULT_ACCOUNTS, ...getCustomAccounts() }[email.toLowerCase()];

      if (!account) {
        try {
          const staffRecords: StaffRecord[] = JSON.parse(
            localStorage.getItem("icare-staff-records") || "[]"
          );
          const match = staffRecords.find(
            (r) =>
              r.email?.toLowerCase() === email.toLowerCase() &&
              r.password === password &&
              r.canLogin
          );
          if (match) {
            const role: string =
              match.position === "Medical Doctors" ? "Doctor" :
              match.position === "Nursing" ? "Nurse" :
              match.position === "Pharmacy" ? "Pharmacist" :
              match.position === "Laboratory" ? "LabTechnician" :
              "HospitalAdmin";
            account = { name: match.name, role };
          }
        } catch {
          // staff records missing or corrupted
        }
      }

      if (!account) {
        throw new Error("Account not found. Please contact your system administrator.");
      }

      const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: account.name, role: account.role },
        },
      });

      if (signUpError) {
        throw new Error(
          `Auto-provisioning failed: ${signUpError.message}. ` +
          `Please ensure "Confirm email" is disabled in your Supabase Authentication settings.`
        );
      }

      if (signUpData?.session) {
        await handlePostAuth(signUpData.session.user.id, signUpData.session.user);
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await handlePostAuth(data.session.user.id, data.session.user);
      }
      return;
    } else if (error) {
      throw error;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await handlePostAuth(data.session.user.id, data.session.user);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, session.user);
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
