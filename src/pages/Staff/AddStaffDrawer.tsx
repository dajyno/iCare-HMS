import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useStaff } from "./StaffContext";
import { useCheckSeatLimit } from "@/src/hooks/useSeatLimit";
import UpgradeSubscriptionModal from "@/src/components/UpgradeSubscriptionModal";
import type { StaffRecord } from "./types";
import { DEPARTMENT_CATEGORIES, getPositionsForDepartment, CLINICIAN_POSITIONS, mapPositionToRole } from "./data";
import { useQueryClient } from "@tanstack/react-query";
import { adminSupabase } from "@/src/lib/adminSupabase";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddStaffModal({ open, onClose }: Props) {
  const { addRecord, records } = useStaff();
  const checkSeatLimit = useCheckSeatLimit();
  const queryClient = useQueryClient();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [position, setPosition] = useState("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>(undefined);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStaffId("");
    setDepartment("");
    setGender("");
    setAddress("");
    setPosition("");
    setError("");
  };

  useEffect(() => {
    if (open) {
      const el = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
      setPortalContainer(el?.parentElement ?? undefined);
      if (!staffId) {
        setStaffId(`STF-${Date.now().toString(36).toUpperCase()}`);
      }
    } else {
      setPortalContainer(undefined);
    }
  }, [open, staffId]);

  const positionOptions = department ? getPositionsForDepartment(department) : [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");

    const normalizedStaffId = staffId.trim();
    if (!firstName.trim() || !lastName.trim() || !position || !normalizedStaffId) {
      setError("First name, last name, staff ID, and position are required.");
      return;
    }

    if (records.some((r) => r.staff_id.toLowerCase() === normalizedStaffId.toLowerCase())) {
      setError("That Staff ID already exists in this workspace. Use a unique Staff ID.");
      return;
    }

    setSaving(true);

    const seatCheck = await checkSeatLimit();
    if (!seatCheck.allowed) {
      setSaving(false);
      setShowUpgradeModal(true);
      return;
    }

    let authUserId: string | undefined;
    const isClinician = CLINICIAN_POSITIONS.includes(position);

    if (isClinician) {
      if (!email.trim()) {
        setSaving(false);
        setError("Clinical staff need an email so they can be linked for appointment booking.");
        return;
      }

      const role = mapPositionToRole(position);
      const tempPassword = `Temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: email.trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}`.trim(), role },
      });

      const authMessage = typeof authError === "string" ? authError : authError?.message;

      if (authData?.user?.id) {
        authUserId = authData.user.id;
      } else if (authMessage?.includes("already registered")) {
        const { data: authUsers } = await (adminSupabase as any).auth.admin.listUsers();
        const existing = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
        authUserId = existing?.id;
      } else if (authError) {
        setSaving(false);
        setError(authMessage || "Failed to link clinical staff for appointment booking.");
        return;
      }

      if (!authUserId) {
        setSaving(false);
        setError("Could not link this clinical staff member for appointment booking.");
        return;
      }
    }

    const newRecord: StaffRecord = {
      staff_id: normalizedStaffId,
      name: `${firstName} ${lastName}`.trim(),
      position,
      department,
      availability_status: "Active",
      is_clinician: isClinician,
      gender,
      address,
      email,

      phone,
      canLogin: false,
      password: "",
      profilePicture: "",
      authUserId,
    };

    const result = await addRecord(newRecord);
    setSaving(false);

    if (result.error) {
      const message = result.error?.message || String(result.error);
      if (result.error?.code === "23505" || message.includes("duplicate key")) {
        setError("That Staff ID is already used. Enter a different Staff ID and try again.");
      } else {
        setError(message || "Failed to add staff record.");
      }
      return;
    }

    resetForm();
    queryClient.invalidateQueries({ queryKey: ["doctors-grid"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff</DialogTitle>
          <DialogDescription>
            Onboard a new employee into the hospital workforce schema.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 py-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="afn">First Name</Label>
              <Input
                id="afn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aln">Last Name</Label>
              <Input
                id="aln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="aemail">Contact Email</Label>
              <Input
                id="aemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@icare.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aphone">Phone Number</Label>
              <Input
                id="aphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="astaffId">Staff ID</Label>
              <Input
                id="astaffId"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="STF-2026-XXXX"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adepartment">Department Category</Label>
              <Select value={department} onValueChange={(v) => { setDepartment(v); setPosition(""); }}>
                <SelectTrigger className="w-full h-10" id="adepartment">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent container={portalContainer}>
                  {DEPARTMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="agender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-full h-10" id="agender">
                  <SelectValue placeholder="Select gender..." />
                </SelectTrigger>
                <SelectContent container={portalContainer}>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aposition">Position</Label>
              <Select
                value={position}
                onValueChange={setPosition}
                disabled={!department}
              >
                <SelectTrigger className="w-full h-10" id="aposition">
                  <SelectValue placeholder={department ? "Select a position..." : "Pick a department first"} />
                </SelectTrigger>
                <SelectContent container={portalContainer}>
                  {positionOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aaddress">Home Address</Label>
            <textarea
              id="aaddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State, ZIP"
              rows={2}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {saving ? "Saving..." : "Save Staff Record"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <UpgradeSubscriptionModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        resourceType="seats"
      />
    </Dialog>
  );
}
