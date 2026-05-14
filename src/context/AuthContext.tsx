import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, toCamel } from "../lib/supabase";
import type { User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      setUser(toCamel(data) as unknown as User);
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error?.message?.includes("Invalid login credentials")) {
      const account = DEFAULT_ACCOUNTS[email.toLowerCase()];
      if (!account) {
        throw new Error("Account not found. Please contact your system administrator.");
      }

      const { error: signUpError } = await supabase.auth.signUp({
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

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
    } else if (error) {
      throw error;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await fetchProfile(data.session.user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
