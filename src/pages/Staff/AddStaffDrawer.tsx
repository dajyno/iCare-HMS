import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import type { StaffRecord, StaffPosition } from "./types";

const POSITION_OPTIONS: StaffPosition[] = [
  "Medical Doctors",
  "Nursing",
  "Pharmacy",
  "Laboratory",
  "Administration",
  "Others",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddStaffDrawer({ open, onClose }: Props) {
  const { addRecord } = useStaff();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState<StaffPosition | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !position || !staffId) return;

    const newRecord: StaffRecord = {
      staff_id: staffId,
      name: `${firstName} ${lastName}`.trim(),
      position: position as StaffPosition,
      department,
      availability_status: "Active",
      is_clinician: position === "Medical Doctors",
      permissions: {
        billing: { enabled: false, views: [] },
        inpatient: { enabled: false, views: [] },
        staff_management: { enabled: false, views: [] },
      },
    };

    addRecord(newRecord);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStaffId("");
    setDepartment("");
    setPosition("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add New Staff</SheetTitle>
          <SheetDescription>
            Onboard a new employee into the hospital workforce schema.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 px-4 py-6 overflow-y-auto flex-1"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@icare.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staffId">Staff ID</Label>
            <Input
              id="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="STF-2026-XXXX"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Assigned Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Cardiology"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">Position</Label>
            <Select
              value={position}
              onValueChange={(val) => setPosition(val as StaffPosition)}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select a position..." />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <SheetFooter className="px-4 pb-4">
          <Button
            variant="outline"
            onClick={onClose}
            size="lg"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="lg"
            className="flex-1 bg-sky-600 hover:bg-sky-700"
          >
            Save Staff Record
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
