import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  User,
  Settings,
  Camera,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import { useAuth } from "@/src/context/AuthContext";
import { saveCustomAccount, removeCustomAccount } from "@/src/lib/accountsStore";
import { useCheckSeatLimit } from "@/src/hooks/useSeatLimit";
import UpgradeSubscriptionModal from "@/src/components/UpgradeSubscriptionModal";
import { useStaff } from "./StaffContext";
import { DEPARTMENT_CATEGORIES, getPositionsForDepartment, CLINICIAN_POSITIONS, mapPositionToRole } from "./data";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Off-Duty": "bg-slate-100 text-slate-500 border-slate-200",
  "On Leave": "bg-amber-100 text-amber-700 border-amber-200",
};

export default function StaffProfile() {
  const { id, hospital_slug } = useParams<{ id: string; hospital_slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { records, updateRecord, deleteRecord } = useStaff();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const checkSeatLimit = useCheckSeatLimit();

  const staff = records.find((r) => r.staff_id === id);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [canLogin, setCanLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("");

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setPosition(staff.position);
      setDepartment(staff.department);
      setGender(staff.gender);
      setAddress(staff.address);
      setEmail(staff.email);
      setPhone(staff.phone);
      setProfilePicture(staff.profilePicture);
      setCanLogin(staff.canLogin);
      setPassword(staff.password);
      setAvailabilityStatus(staff.availability_status);
    }
  }, [staff?.staff_id]);

  if (!staff) {
    return (
      <div className="text-center py-24">
        <p className="text-lg text-slate-500">Staff member not found</p>
        <Button
          onClick={() => navigate(`/${hospital_slug}/staff`)}
          variant="outline"
          className="mt-4"
        >
          Back to Staff Roster
        </Button>
      </div>
    );
  }

  const isOwnProfile = user?.email === staff.email;
  const staffRole: string = mapPositionToRole(staff.position);

  const handlePictureUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setProfilePicture(dataUrl);
      await updateRecord(staff.staff_id, { profilePicture: dataUrl });
      if (user?.email === staff.email) {
        localStorage.setItem("staff_profile_picture", dataUrl);
        window.dispatchEvent(
          new CustomEvent("profile-picture-updated", { detail: dataUrl })
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDetails = async () => {
    if (!position) return;
    const { error: saveError } = await updateRecord(staff.staff_id, {
      name,
      position,
      department,
      gender,
      address,
      email,
      phone,
      profilePicture,
      is_clinician: CLINICIAN_POSITIONS.includes(position),
    });
    if (saveError) {
      toast.error("Failed to save staff details");
      return;
    }

    if (staff.authUserId) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", staff.authUserId)
        .maybeSingle();
      if (existingUser) {
        const { error: roleError } = await (supabase as any)
          .from("users")
          .update({ role: mapPositionToRole(position) })
          .eq("id", staff.authUserId);
        if (roleError) {
          console.error("Failed to sync role to users table:", roleError);
          toast.error("Staff record saved but role sync failed");
          return;
        }
      }
    }

    if (profilePicture && isOwnProfile) {
      localStorage.setItem("staff_profile_picture", profilePicture);
      window.dispatchEvent(
        new CustomEvent("profile-picture-updated", { detail: profilePicture })
      );
    }
    toast.success("Profile details saved");
    navigate(`/${hospital_slug}/staff`);
  };

  const handleSaveSettings = async () => {
    await updateRecord(staff.staff_id, {
      canLogin,
      password: canLogin ? password : "",
      availability_status: availabilityStatus as any,
    });
    if (canLogin && password.length >= 6 && staff.email) {
      if (!staff.canLogin) {
        const seatCheck = await checkSeatLimit();
        if (!seatCheck.allowed) {
          setShowUpgradeModal(true);
          return;
        }
      }
      saveCustomAccount(staff.email, { name: staff.name, role: staffRole });

      try {
        const { data, error } = await adminSupabase.auth.admin.createUser({
          email: staff.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: staff.name, role: staffRole },
        });
        if (error) {
          if (error.message?.includes("already registered")) {
            toast.success("Login access granted (account already exists)");
          } else {
            toast.error(error.message);
          }
        } else {
          if (data?.user?.id) {
            await updateRecord(staff.staff_id, { authUserId: data.user.id });
          }
          toast.success("Login access granted");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to create account");
      }
    } else if (!canLogin && staff.email) {
      removeCustomAccount(staff.email);
      toast.success("Login access revoked");
    }

    toast.success("Staff settings saved");
  };

  const handleDelete = async () => {
    await deleteRecord(staff.staff_id);
    setShowDeleteConfirm(false);
    navigate(`/${hospital_slug}/staff`);
  };

  const changed =
    name !== staff.name ||
    position !== staff.position ||
    department !== staff.department ||
    gender !== staff.gender ||
    address !== staff.address ||
    email !== staff.email ||
    phone !== staff.phone ||
    profilePicture !== staff.profilePicture;

  const settingsChanged =
    canLogin !== staff.canLogin ||
    (canLogin && password !== staff.password) ||
    availabilityStatus !== staff.availability_status;

  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6 animate-in fade-in duration-500"
    >
      {/* Back Button + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/${hospital_slug}/staff`)}
          className="h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          {/* Profile Picture */}
          <div className="relative shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-sky-300 transition-colors group"
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureUpload}
              className="hidden"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">
              {name}
            </h1>
            <p className="text-sm text-slate-500">{staff.staff_id}</p>
          </div>
        </div>
        <Badge className={STATUS_STYLES[staff.availability_status]}>
          {staff.availability_status}
        </Badge>
      </div>

      {/* Tabbed Workspace */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="bg-slate-100 p-0.5">
              <TabsTrigger
                value="details"
                className="gap-1.5 data-[state=active]:bg-white text-xs"
              >
                <User className="w-3.5 h-3.5" />
                Staff Details
              </TabsTrigger>

              <TabsTrigger
                value="settings"
                className="gap-1.5 data-[state=active]:bg-white text-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* === DETAILS TAB === */}
            <TabsContent value="details" className="mt-0 pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edName">Full Name</Label>
                    <Input
                      id="edName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Staff ID</Label>
                    <Input
                      value={staff.staff_id}
                      disabled
                      className="bg-slate-50 text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edDept">Department Category</Label>
                    <Select value={department} onValueChange={(v) => { setDepartment(v); setPosition(""); }}>
                      <SelectTrigger className="w-full h-10" id="edDept">
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
                    <Label htmlFor="edPosition">Position</Label>
                    <Select
                      value={position}
                      onValueChange={setPosition}
                      disabled={!department}
                    >
                      <SelectTrigger className="w-full h-10" id="edPosition">
                        <SelectValue placeholder={department ? "Select a position..." : "Pick a department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getPositionsForDepartment(department).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edGender">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="w-full h-10" id="edGender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edEmail">Email</Label>
                    <Input
                      id="edEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edPhone">Phone</Label>
                    <Input
                      id="edPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edAddress">Home Address</Label>
                  <textarea
                    id="edAddress"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {changed
                      ? "You have unsaved changes"
                      : "All details are up to date"}
                  </span>
                  <Button
                    onClick={handleSaveDetails}
                    disabled={!changed}
                    size="sm"
                    className="gap-2 bg-sky-600 hover:bg-sky-700"
                  >
                    Save Details
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* === SETTINGS TAB === */}
            <TabsContent value="settings" className="mt-0 pt-4">
              <div className="space-y-6">
                {/* Login Toggle */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Account Access
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Allow system login
                      </p>
                      <p className="text-xs text-slate-500">
                        Grants this staff member access to the iCare software
                      </p>
                    </div>
                    <button
                      onClick={() => setCanLogin(!canLogin)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        canLogin ? "bg-sky-600" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                          canLogin && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {canLogin && (
                    <div className="space-y-1.5 pl-1">
                      <Label htmlFor="edPassword">
                        Set Password{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          (minimum 6 characters)
                        </span>
                      </Label>
                      <Input
                        id="edPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter a password for this staff"
                        minLength={6}
                      />
                    </div>
                  )}
                </div>

                {/* Availability Status */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Availability Status
                  </h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="edStatus">Current Status</Label>
                    <Select
                      value={availabilityStatus}
                      onValueChange={setAvailabilityStatus}
                    >
                      <SelectTrigger className="w-full sm:w-64 h-10" id="edStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </SelectItem>
                        <SelectItem value="Off-Duty">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Off-Duty
                          </span>
                        </SelectItem>
                        <SelectItem value="On Leave">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            On Leave
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Save + Delete */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Profile
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={!settingsChanged}
                    size="sm"
                    className="gap-2 bg-sky-600 hover:bg-sky-700"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UpgradeSubscriptionModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        resourceType="seats"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Staff Profile
            </DialogTitle>
            <DialogDescription>
              This action permanently removes{" "}
              <span className="font-semibold text-slate-900">{staff.name}</span>{" "}
              from the workforce roster. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
