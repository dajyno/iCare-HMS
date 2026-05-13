import { useAuth } from "@/src/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Briefcase, Calendar } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white border rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-sm">
        <Avatar className="h-24 w-24 border-4 border-slate-50 ring-2 ring-sky-100">
          <AvatarFallback className="text-2xl font-bold bg-sky-50 text-sky-600">
            {user?.fullName?.split(" ").map((n: string) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        
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
              <div className="text-center py-12 text-slate-400 space-y-2">
                <p className="text-sm font-medium">No recent logs to display</p>
                <p className="text-xs opacity-70">Your recent interactions with patients and reports will appear here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
