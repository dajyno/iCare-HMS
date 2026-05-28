import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { supabase, toCamel } from "../../lib/supabase";
import { adminSupabase } from "../../lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Tenant } from "../../types/tenant";

const TenantLogin: React.FC = () => {
  const { hospital_slug } = useParams<{ hospital_slug: string }>();
  const { login } = useAuth();
  const { tenant, setTenant } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [hospitalName, setHospitalName] = useState("");
  const [tenantResolved, setTenantResolved] = useState(false);
  const [tenantError, setTenantError] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [animPhase, setAnimPhase] = useState<"idle" | "collapsing" | "revealing" | "held">("idle");

  const isDemo = searchParams.get("demo") === "true";
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isMobile = window.innerWidth < 1024;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hospital_slug) {
      setTenantError(true);
      return;
    }

    let cancelled = false;

    supabase
      .from("tenants")
      .select("*")
      .eq("url_slug", hospital_slug)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setTenantError(true);
          return;
        }
        const t = toCamel(data) as Tenant;
        if (t.status === "Suspended") {
          setTenant(t);
          setTenantError(true);
          return;
        }
        setHospitalName(t.hospitalName);
        setTenant(t);
        setTenantResolved(true);
      });

    return () => { cancelled = true; };
  }, [hospital_slug]);

  useEffect(() => {
    if (isDemo && tenantResolved && !submittedRef.current) {
      submittedRef.current = true;
      setDemoLoading(true);
      setEmail("demo@icare.com");
      setPassword("password123");
      const timer = setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isDemo, tenantResolved]);

  useEffect(() => {
    if (animPhase === "collapsing") {
      const delay = isMobile ? 1250 : 1100;
      const t = setTimeout(() => setAnimPhase("revealing"), delay);
      return () => clearTimeout(t);
    }
    if (animPhase === "revealing") {
      const delay = isMobile ? 850 : 800;
      const t = setTimeout(() => setAnimPhase("held"), delay);
      return () => clearTimeout(t);
    }
    if (animPhase === "held") {
      const delay = 1000;
      const t = setTimeout(() => navigate(`/${hospital_slug}/dashboard`), delay);
      return () => clearTimeout(t);
    }
  }, [animPhase, hospital_slug, navigate, isMobile]);

  // Kick off dashboard data prefetch as soon as collapse begins
  useEffect(() => {
    if (animPhase === "collapsing") {
      prefetchDashboardData();
    }
  }, [animPhase]);

  const prefetchDashboardData = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const [
        { count: totalPatients },
        { count: consultationsToday },
        { count: pendingLabs },
        { count: pendingScans },
        { count: pendingRx },
        { data: beds },
        { data: dailyPayments },
        { count: unpaidInvoices },
        { count: activeStaff },
      ] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("consultations").select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
        supabase.from("lab_requests").select("*", { count: "exact", head: true })
          .neq("status", "Completed"),
        supabase.from("radiology_requests").select("*", { count: "exact", head: true })
          .neq("status", "Completed"),
        supabase.from("prescriptions").select("*", { count: "exact", head: true })
          .eq("status", "Paid"),
        supabase.from("beds").select("status"),
        supabase.from("invoices").select("amount_paid")
          .eq("status", "Paid")
          .gte("paid_at", today.toISOString()).lt("paid_at", tomorrow.toISOString()),
        supabase.from("invoices").select("*", { count: "exact", head: true })
          .neq("status", "Paid"),
        (adminSupabase as any).from("staff").select("*", { count: "exact", head: true }),
      ]);

      const occupiedBeds = (beds || []).filter((b: any) => b.status === "Occupied").length;
      const totalBeds = beds?.length || 1;

      queryClient.setQueryData(["dashboard-stats"], {
        totalPatients: totalPatients || 0,
        consultationsToday: consultationsToday || 0,
        pendingLabs: pendingLabs || 0,
        pendingScans: pendingScans || 0,
        pendingRx: pendingRx || 0,
        bedOccupancy: Math.round((occupiedBeds / totalBeds) * 100),
        dailyRevenue: (dailyPayments || []).reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0,
        outstandingClaims: unpaidInvoices || 0,
        activeStaff: activeStaff || 0,
      });

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, start_time, status, patients(id, first_name, last_name)")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (appointments) {
        queryClient.setQueryData(["upcoming-appointments"], appointments);
      }
    } catch {
      // prefetch failed silently — dashboard will load its own queries
    }
  }, [queryClient, supabase, adminSupabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password, tenant?.tenantId);
      setAnimPhase("collapsing");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
      setDemoLoading(false);
    }
  };

  const handleDemoClick = () => {
    navigate("/demo/login?demo=true");
  };

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4 font-sans">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold text-blue-300">?</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Hospital Workspace Not Found</h1>
          <p className="text-slate-500 text-sm">
            The hospital workspace you're looking for doesn't exist or has been suspended.
          </p>
        </div>
      </div>
    );
  }

  if (!tenantResolved) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4 font-sans pb-16 lg:pb-0">
      <motion.div
        className="relative w-full max-w-[1000px] bg-white rounded-[24px] overflow-hidden shadow-2xl flex-col lg:flex-row max-h-[calc(100vh-2rem)]"
        animate={
          isMobile && animPhase !== "idle"
            ? { width: "100vw", height: "100dvh", maxWidth: "none", maxHeight: "none", borderRadius: 0, boxShadow: "0 0 #0000" }
            : {}
        }
        transition={
          isMobile && animPhase === "collapsing"
            ? { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.4 }
            : { duration: 0.3 }
        }
      >
        <AnimatePresence>
          {animPhase !== "revealing" && animPhase !== "held" && (
            <motion.div
              key="split-panes"
              className="flex w-full flex-col lg:flex-row"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Left Form Pane */}
              <motion.div
                className="w-full lg:w-[45%] p-6 lg:p-10 flex flex-col"
                animate={animPhase === "collapsing" && !isMobile ? { x: "50%" } : { x: "0%" }}
                transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Branding */}
                <motion.div
                  className="mb-8 lg:mb-10 text-center lg:text-left"
                  animate={animPhase === "collapsing" ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img src="/logo.png" alt="iCare" className="h-10 w-auto inline-block lg:inline" />
                </motion.div>

                {/* Form */}
                <motion.div
                  className="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full"
                  animate={animPhase === "collapsing" ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-1.5 text-center lg:text-left">Sign in</h2>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed text-center lg:text-left">
                    Enter your assigned hospital credentials to enter the operating platform.
                  </p>

                  <form ref={formRef} onSubmit={handleSubmit}>
                    {error && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-3 py-2.5 rounded-lg flex items-center gap-2 mb-4">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="space-y-1.5 mb-4">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@hospital.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={animPhase !== "idle"}
                        className="h-12 lg:h-10 bg-slate-50/50 border-slate-200 focus-visible:border-[#0088ff] focus-visible:ring-[#0088ff]/20"
                      />
                    </div>

                    <div className="space-y-1.5 mb-6">
                      <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={animPhase !== "idle"}
                          className="h-12 lg:h-10 bg-slate-50/50 border-slate-200 focus-visible:border-[#0088ff] focus-visible:ring-[#0088ff]/20 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 lg:h-11 text-sm font-semibold bg-[#0088ff] hover:bg-[#0077ee] text-white rounded-lg shadow-sm cursor-pointer"
                      disabled={loading || demoLoading || animPhase !== "idle"}
                    >
                      {(loading || demoLoading) && animPhase === "idle" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "[ Login ]"
                      )}
                    </Button>
                  </form>
                </motion.div>

                {/* Demo trigger (desktop) */}
                <motion.div
                  className="hidden lg:block mt-auto pt-8 text-center"
                  animate={animPhase === "collapsing" ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-xs text-slate-400">
                    Looking to explore the iCare platform?{' '}
                    <button
                      type="button"
                      onClick={handleDemoClick}
                      className="text-[#0088ff] font-semibold hover:underline cursor-pointer"
                    >
                      Try Live Demo
                    </button>
                  </p>
                </motion.div>
              </motion.div>

              {/* Right Visual Banner Pane */}
              <motion.div
                className="hidden lg:block relative lg:w-[55%]"
                animate={animPhase === "collapsing" ? { x: "-50%" } : { x: "0%" }}
                transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className={`absolute inset-0 ${animPhase === "collapsing" ? "blur" : ""}`}
                  animate={animPhase === "collapsing" ? { opacity: 0.4 } : { opacity: 1 }}
                  transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <motion.div
                  className="absolute bottom-6 right-6 bg-[#0088ff] rounded-[12px] p-6 max-w-[280px] shadow-lg"
                  animate={animPhase === "collapsing" ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: isMobile ? 0.4 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-sm text-white/90 leading-relaxed">
                    A secure, unified Hospital Management Information System built for absolute clinical precision, automated workflows, and seamless multi-tenant isolation.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reveal Overlay */}
        <AnimatePresence>
          {(isMobile ? animPhase === "revealing" || animPhase === "held" : animPhase !== "idle") && (
            <motion.div
              key="reveal"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, borderRadius: isMobile && animPhase !== "idle" ? 0 : 24 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.img
                src="/logo.png"
                alt="iCare"
                className="h-16 w-auto mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: isMobile ? 0.7 : 0.8, ease: "easeOut", delay: isMobile ? 0.15 : 0.2 }}
              />
              <motion.p
                className="text-3xl font-bold text-slate-900"
                initial={{ opacity: 0, letterSpacing: "0.05em" }}
                animate={{ opacity: 1, letterSpacing: "0.2em" }}
                transition={{ duration: isMobile ? 0.7 : 0.8, ease: "easeOut", delay: isMobile ? 0.15 : 0.35 }}
              >
                WELCOME
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Demo trigger (mobile fixed bar) */}
      {animPhase === "idle" && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4 text-center z-50">
        <p className="text-xs text-slate-400">
          Looking to explore the iCare platform?{' '}
          <button
            type="button"
            onClick={handleDemoClick}
            className="text-[#0088ff] font-semibold hover:underline cursor-pointer"
          >
            Try Live Demo
          </button>
        </p>
      </div>
      )}
    </div>
  );
};

export default TenantLogin;
