import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase, toCamel } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGlobalSettings } from "../context/GlobalSettingsContext";
import { useTenant } from "../context/TenantContext";
import { findModuleForPath } from "../lib/moduleAccess";
import type { Tenant } from "../types/tenant";
import DashboardLayout from "../layouts/DashboardLayout";
import HospitalNotFound from "./HospitalNotFound";
import AccountSuspended from "./AccountSuspended";
import ModuleLockedPage from "./ModuleLockedPage";

const TenantRouteGuard: React.FC = () => {
  const { hospital_slug } = useParams<{ hospital_slug: string }>();
  const { user, loading: authLoading, logout } = useAuth();
  const { settings } = useGlobalSettings();
  const { tenant, setTenant, effectiveAllowedModules, refreshTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolved, setResolved] = useState<"loading" | "not_found" | "suspended" | "ok">("loading");

  useEffect(() => {
    if (!hospital_slug) {
      setResolved("not_found");
      return;
    }

    let cancelled = false;

    async function resolveTenant() {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("url_slug", hospital_slug)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setResolved("not_found");
        return;
      }

      const t = toCamel(data) as Tenant;

      if (t.status === "Suspended") {
        setTenant(t);
        setResolved("suspended");
        return;
      }

      setTenant(t);
      setResolved("ok");
    }

    resolveTenant();

    return () => { cancelled = true; };
  }, [hospital_slug]);

  useEffect(() => {
    if (resolved === "ok" && tenant) {
      refreshTenant();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (resolved !== "ok" || authLoading) return;
    if (!user) {
      navigate(`/${hospital_slug}/login`, { replace: true });
      return;
    }
    if (user.tenantId && user.tenantId !== tenant?.tenantId) {
      logout();
      navigate(`/${hospital_slug}/login`, { replace: true });
      return;
    }
  }, [resolved, authLoading, user, tenant, hospital_slug]);

  if (resolved === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (resolved === "not_found") return <HospitalNotFound />;
  if (resolved === "suspended") return <AccountSuspended hospitalName={tenant?.hospitalName} />;

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate(`/${hospital_slug}/login`, { replace: true });
    return null;
  }

  if (user.role) {
    const roleKey = user.role as string;
    const matrix = settings.rbacMatrix;
    const perm = matrix[roleKey as keyof typeof matrix];
    if (perm && perm.allowedRoutes.length > 0) {
      const baseRoutes = perm.allowedRoutes;
      const overrides = settings.staffRouteOverrides?.[user.id] || [];
      const effectiveRoutes = [...baseRoutes, ...overrides];
      const path = location.pathname;
      const allowed = effectiveRoutes.some((route: string) =>
        path === route || path.startsWith(route + "/") || path.startsWith(`/${hospital_slug}${route}`)
      );
      if (!allowed) {
        navigate(`/${hospital_slug}/dashboard`, { replace: true });
        return null;
      }
    }
  }

  const lockedModule = findModuleForPath(location.pathname);
  if (lockedModule && !effectiveAllowedModules.includes(lockedModule)) {
    return (
      <DashboardLayout>
        <ModuleLockedPage moduleName={lockedModule} />
      </DashboardLayout>
    );
  }

  return <DashboardLayout><Outlet /></DashboardLayout>;
};

export default TenantRouteGuard;
