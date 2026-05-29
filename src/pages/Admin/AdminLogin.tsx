import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Shield } from "lucide-react";

const AdminLogin: React.FC = () => {
  const { login } = useAdminAuth();
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
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_24px_rgba(37,99,235,0.25)]">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">iCare SaaS</h1>
        </div>

        <Card className="bg-white border-slate-200 shadow-lg ring-1 ring-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900">Admin Access</CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Sign in to the platform control center
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@icare.ng"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_0_16px_rgba(37,99,235,0.2)]" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
