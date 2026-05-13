import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Bell, Lock, Globe, Shield } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-slate-500 text-sm">Configure hospital-wide preferences and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white shadow-sm border border-slate-200 font-semibold text-sky-600">
            <SettingsIcon className="w-4 h-4" />
            General
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600">
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600">
            <Shield className="w-4 h-4" />
            Security & Roles
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600">
            <Globe className="w-4 h-4" />
            Regional & Localization
          </Button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="hospital-name">Hospital Name</Label>
                <Input id="hospital-name" defaultValue="iCare Medical Center" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">System Email</Label>
                <Input id="contact-email" defaultValue="admin@icare.com" />
              </div>
              <Button className="bg-sky-600">Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Database Connection</CardTitle>
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">You are currently connected to the primary SQLite production instance.</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
