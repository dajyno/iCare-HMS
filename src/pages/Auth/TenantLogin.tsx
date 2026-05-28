import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { supabase, toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
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

  const isDemo = searchParams.get("demo") === "true";
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password, tenant?.tenantId);
      navigate(`/${hospital_slug}/dashboard`);
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
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4 py-8 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[24px] overflow-hidden shadow-2xl flex">
        {/* Left Form Pane */}
        <div className="w-[45%] p-10 flex flex-col">
          {/* Branding */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#0088ff] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              i
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">iCare HIMS</h1>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5">{hospitalName}</p>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Sign in</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
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
                  className="h-10 bg-slate-50/50 border-slate-200 focus-visible:border-[#0088ff] focus-visible:ring-[#0088ff]/20"
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
                    className="h-10 bg-slate-50/50 border-slate-200 focus-visible:border-[#0088ff] focus-visible:ring-[#0088ff]/20 pr-10"
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
                className="w-full h-11 text-sm font-semibold bg-[#0088ff] hover:bg-[#0077ee] text-white rounded-lg shadow-sm cursor-pointer"
                disabled={loading || demoLoading}
              >
                {loading || demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "[ Login ]"
                )}
              </Button>
            </form>
          </div>

          {/* Demo trigger */}
          <div className="mt-auto pt-8 text-center">
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
        </div>

        {/* Right Visual Banner Pane */}
        <div className="relative w-[55%] min-h-[600px]">
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute bottom-6 right-6 bg-[#0088ff] rounded-[12px] p-6 max-w-[280px] shadow-lg">
            <p className="text-sm text-white/90 leading-relaxed">
              A secure, unified Hospital Management Information System built for absolute clinical precision, automated workflows, and seamless multi-tenant isolation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantLogin;
