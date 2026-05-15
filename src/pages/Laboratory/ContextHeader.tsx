import { Link } from "react-router-dom";
import { ExternalLink, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ContextHeaderProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
  } | null;
}

const computeAge = (dob: string) => {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

const ContextHeader = ({ patient }: ContextHeaderProps) => {
  if (!patient) {
    return (
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 text-slate-400">
          <User className="w-5 h-5" />
          <span className="text-sm">No patient selected — browse the order queue</span>
        </div>
      </div>
    );
  }

  const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`;
  const age = computeAge(patient.dateOfBirth);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10 border-2 border-slate-200">
          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-bold text-slate-900">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="text-[11px] text-slate-500">
            {patient.gender}, {age} yrs
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-[#005EB8] text-xs" asChild>
        <Link to={`/patients/${patient.id}`}>
          View Profile
          <ExternalLink className="w-3 h-3" />
        </Link>
      </Button>
    </div>
  );
};

export default ContextHeader;
