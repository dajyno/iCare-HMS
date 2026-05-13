import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-100">
            i
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">iCare HIMS</h1>
        </div>

        <Card className="shadow-sm border-slate-200 ring-1 ring-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold">Sign in</CardTitle>
            <CardDescription className="text-xs">
              Access your hospital management dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@icare.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-slate-50/50 border-slate-200 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</Label>
                </div>
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
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Access Workspace"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            POWERED BY ICARE HEALTH SYSTEMS
          </p>
          <div className="h-0.5 w-6 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
