import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import { useAuth } from "@/src/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Mail, Phone, MapPin, Briefcase, Calendar, Camera, Pencil, Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: any;
  timestamp: string;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const Profile = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["profile-audit-logs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as AuditLog[]) ?? [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const stored = localStorage.getItem("staff_profile_picture");
    if (stored) setProfilePicture(stored);
  }, []);

  const openEdit = () => {
    setEditName(user?.fullName || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setEditError("");
    setEditOpen(true);
  };

  const handlePictureUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setProfilePicture(dataUrl);
      localStorage.setItem("staff_profile_picture", dataUrl);
      window.dispatchEvent(new CustomEvent("profile-picture-updated", { detail: dataUrl }));
      if (user?.id) {
        const { data: staffRow } = await (adminSupabase as any)
          .from("staff")
          .select("staff_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (staffRow) {
          await (adminSupabase as any)
            .from("staff")
            .update({ profile_picture: dataUrl })
            .eq("staff_id", staffRow.staff_id);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setEditError("");
    try {
      const { error } = await (adminSupabase as any)
        .from("users")
        .update({
          full_name: editName,
          email: editEmail,
          phone: editPhone || null,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message || "Failed to update profile");
      setEditOpen(false);
      window.location.reload();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.fullName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white border rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-sm">
        <div className="relative shrink-0">
          <Avatar className="h-24 w-24 border-4 border-slate-50 ring-2 ring-sky-100">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt="" />
            ) : null}
            <AvatarFallback className="text-2xl font-bold bg-sky-50 text-sky-600">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">{user?.fullName}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-none font-bold uppercase tracking-wider px-3">
              {user?.role}
            </Badge>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 text-sm font-medium">Healthcare Professional</span>
          </div>
          <p className="text-slate-500 text-sm max-w-xl mx-auto md:mx-0">
            Dedicated hospital staff member committed to providing exceptional care and operational excellence within the iCare system.
          </p>
          <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Change Photo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePictureUpload}
            />
            <span className="text-slate-300">|</span>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Email Address</p>
                  <p className="text-slate-900 font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Phone Number</p>
                  <p className="text-slate-900 font-medium">{user?.phone || "+1 (555) 000-0000"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Office Location</p>
                  <p className="text-slate-900 font-medium">Main Hospital Wing, Level 2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-sky-500 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Department</p>
                  <p className="text-sm text-slate-500">Clinical Operations / General Medicine</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-sky-500 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Member Since</p>
                  <p className="text-sm text-slate-500">January 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <p className="text-sm font-medium">No recent logs to display</p>
                  <p className="text-xs opacity-70">Your recent interactions with patients and reports will appear here.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {log.action}
                          </p>
                          {log.entity && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {log.entity}{log.entity_id ? ` — ${log.entity_id.slice(0, 8)}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-4">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-slate-200">
                  {profilePicture ? (
                    <AvatarImage src={profilePicture} alt="" />
                  ) : null}
                  <AvatarFallback className="text-lg font-bold bg-sky-50 text-sky-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center cursor-pointer hover:bg-sky-600 transition-colors shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9 text-sm" />
            </div>
            {editError && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</div>
            )}
          </div>
          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="h-9">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              className="h-9 bg-sky-600 hover:bg-sky-700 gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;