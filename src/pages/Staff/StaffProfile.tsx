import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  User,
  Shield,
  Mail,
  Phone,
  Building2,
  Hash,
  Stethoscope,
  Badge as BadgeIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStaff } from "./StaffContext";
import PermissionsMatrix from "./PermissionsMatrix";
import type { FC } from "react";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Off-Duty": "bg-slate-100 text-slate-500 border-slate-200",
  "On Leave": "bg-amber-100 text-amber-700 border-amber-200",
};

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records } = useStaff();

  const staff = records.find((r) => r.staff_id === id);

  if (!staff) {
    return (
      <div className="text-center py-24">
        <p className="text-lg text-slate-500">Staff member not found</p>
        <Button
          onClick={() => navigate("/staff")}
          variant="outline"
          className="mt-4"
        >
          Back to Staff Roster
        </Button>
      </div>
    );
  }

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
          onClick={() => navigate("/staff")}
          className="h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100">
            <User className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{staff.name}</h1>
            <p className="text-sm text-slate-500">{staff.staff_id}</p>
          </div>
        </div>
        <Badge
          className={cn("ml-auto", STATUS_STYLES[staff.availability_status])}
        >
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
                value="permissions"
                className="gap-1.5 data-[state=active]:bg-white text-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                Roles & Permissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailCard
                  icon={Hash}
                  label="Staff ID"
                  value={staff.staff_id}
                />
                <DetailCard
                  icon={Stethoscope}
                  label="Position"
                  value={staff.position}
                />
                <DetailCard
                  icon={Building2}
                  label="Department"
                  value={staff.department}
                />
                <DetailCard
                  icon={BadgeIcon}
                  label="Clinician Status"
                  value={
                    staff.is_clinician ? "Yes — Active Clinician" : "No"
                  }
                />
                <DetailCard
                  icon={Mail}
                  label="Email"
                  value={`${staff.name
                    .toLowerCase()
                    .replace(/\s+/g, ".")}@icare.com`}
                />
                <DetailCard
                  icon={Phone}
                  label="Phone"
                  value="+1 (555) 000-0000"
                />
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 pt-4">
              <PermissionsMatrix staff={staff} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}

const DetailCard: FC<{
  icon: FC<{ className?: string }>;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
    <div className="p-1.5 rounded-md bg-white border border-slate-200">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
    </div>
  </div>
);
