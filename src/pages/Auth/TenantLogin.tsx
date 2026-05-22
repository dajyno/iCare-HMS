import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { supabase, toCamel } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Tenant } from "../../types/tenant";

const TenantLogin: React.FC = () => {
  const { hospital_slug } = useParams<{ hospital_slug: string }>();
  const { login } = useAuth();
  const { setTenant } = useTenant();
  const navigate = useNavigate();

  const [hospitalName, setHospitalName] = useState("");
  const [tenantResolved, setTenantResolved] = useState(false);
  const [tenantError, setTenantError] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    }
  };

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold text-slate-300">?</span>
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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-100">
            i
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">iCare HIMS</h1>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">{hospitalName}</p>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200 ring-1 ring-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold">Sign in</CardTitle>
            <CardDescription className="text-xs">
              Access {hospitalName} management dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hospital.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-slate-50/50 border-slate-200 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-slate-50/50 border-slate-200 focus:ring-sky-500"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full h-10 text-sm font-bold bg-sky-600 hover:bg-sky-700 shadow-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Access ${hospitalName}`
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            POWERED BY ICARE HEALTH SYSTEMS
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantLogin;
