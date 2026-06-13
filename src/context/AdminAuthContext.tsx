import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { PlatformAdmin } from "../types/tenant";

const SESSION_KEY = "icare_admin_session";

interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthContextType {
  admin: PlatformAdmin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminSession;
        setAdmin({
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          role: parsed.role as PlatformAdmin["role"],
        });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Login failed");
    }

    const data = await response.json();

    const session: AdminSession = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    setAdmin({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as PlatformAdmin["role"],
    });
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return context;
};
