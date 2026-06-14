import { useState, useRef, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENT_CATEGORIES, getPositionsForDepartment, CLINICIAN_POSITIONS, mapPositionToRole } from "@/src/pages/Staff/data";
import { Mail, Phone, MapPin, Briefcase, Calendar, Camera, Pencil, Loader2 } from "lucide-react";

function formatDate(ts: string | null | undefined) {
  if (!ts) return "N/A";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicture, setProfilePicture] = useState(() =>
    localStorage.getItem("staff_profile_picture") || ""
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const { data: staffRecord } = useQuery({
    queryKey: ["profile-staff", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (adminSupabase as any)
        .from("staff")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return data as Record<string, any> | null;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });

  const profileRole = staffRecord?.position
    ? mapPositionToRole(staffRecord.position)
    : user?.role;

  const openEdit = () => {
    setEditName(user?.fullName || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    if (staffRecord) {
      setEditDepartment(staffRecord.department || "");
      setEditPosition(staffRecord.position || "");
      setEditGender(staffRecord.gender || "");
      setEditAddress(staffRecord.address || "");
    } else {
      setEditDepartment("");
      setEditPosition("");
      setEditGender("");
      setEditAddress("");
    }
    setEditError("");
    setEditOpen(true);
  };

  const handlePictureUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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
      const mappedRole = mapPositionToRole(editPosition);
      const { error: userErr } = await (adminSupabase as any)
        .from("users")
        .upsert({
          id: user.id,
          full_name: editName,
          email: editEmail,
          phone: editPhone || null,
          role: mappedRole,
          status: "active",
        }, { onConflict: "id" });
      if (userErr) throw new Error(userErr.message || "Failed to update profile");

      if (staffRecord) {
        const { error: staffErr } = await (adminSupabase as any)
          .from("staff")
          .update({
            name: editName,
            email: editEmail,
            phone: editPhone || null,
            department: editDepartment,
            position: editPosition,
            is_clinician: CLINICIAN_POSITIONS.includes(editPosition),
            gender: editGender,
            address: editAddress,
          })
          .eq("staff_id", staffRecord.staff_id);
        if (staffErr) throw new Error(staffErr.message || "Failed to update staff record");
      }

      await refreshUser();
      setEditOpen(false);
      toast.success("Profile updated successfully");
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
              {profileRole}
            </Badge>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 text-sm font-medium">Healthcare Professional</span>
          </div>

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
                  <p className="text-slate-900 font-medium">{user?.phone || staffRecord?.phone || "+1 (555) 000-0000"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Office Location</p>
                  <p className="text-slate-900 font-medium">
                    {staffRecord?.address || "Main Hospital Wing, Level 2"}
                  </p>
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
                  <p className="text-sm text-slate-500">
                    {staffRecord?.department || "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-sky-500 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Member Since</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Gender</Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select gender..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Department Category</Label>
                <Select value={editDepartment} onValueChange={(v) => { setEditDepartment(v); setEditPosition(""); }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Position</Label>
                <Select value={editPosition} onValueChange={setEditPosition} disabled={!editDepartment}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder={editDepartment ? "Select position..." : "Pick department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getPositionsForDepartment(editDepartment).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Address</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-9 text-sm" />
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