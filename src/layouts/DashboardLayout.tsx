import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Pill,
  Package,
  Bed,
  UserPlus,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SidebarItem = ({ icon: Icon, label, href, active }: any) => (
  <Link
    to={href}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
      active
        ? "bg-sky-50 text-sky-700 shadow-none"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
    <span>{label}</span>
  </Link>
);

const SidebarGroup = ({ icon: Icon, label, children, currentPath, defaultOpen }: any) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const hasActiveChild = children?.some((c: any) =>
    c.href === "/" ? currentPath === "/" : currentPath.startsWith(c.href)
  );

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium w-full text-left",
          hasActiveChild
            ? "bg-sky-50 text-sky-700 shadow-none"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span className="flex-1">{label}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
          {children.map((child: any) => (
            <SidebarItem
              key={child.href}
              href={child.href}
              label={child.label}
              active={currentPath.startsWith(child.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("patients")
          .select("id, patient_id, first_name, last_name, phone")
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(8);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Patients", children: [
      { label: "All Patients", href: "/patients" },
      { label: "Individual", href: "/patients/individual" },
      { label: "Family", href: "/patients/family" },
      { label: "Corporate", href: "/patients/corporate" },
      { label: "HMO", href: "/patients/hmo" },
    ]},
    { icon: Calendar, label: "Appointments", href: "/appointments" },
    { icon: ClipboardList, label: "Consultations", children: [
      { label: "Clinical Workspace", href: "/consultations" },
      { label: "Vital Signs", href: "/consultations/vitals" },
    ]},
    { icon: CreditCard, label: "Billing", href: "/billing" },
    { icon: FlaskConical, label: "Laboratory", href: "/laboratory" },
    { icon: Pill, label: "Pharmacy", href: "/pharmacy" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Bed, label: "Inpatient", href: "/inpatient" },
    { icon: UserPlus, label: "Staff", href: "/staff" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Settings, label: "System Settings", href: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold">
            i
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">iCare</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          <nav className="space-y-1">
            {navItems.map((item: any) =>
              item.children ? (
                <SidebarGroup key={item.label} {...item} currentPath={location.pathname} />
              ) : (
                <SidebarItem
                  key={item.href}
                  {...item}
                  active={item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)}
                />
              )
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group">
            <Avatar className="h-9 w-9 border border-slate-200 group-hover:border-sky-200">
              <AvatarFallback className="bg-white text-sky-600 text-xs font-bold">
                {user?.fullName?.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          </Link>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/settings">
              <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-slate-500 text-[10px] h-8 hover:bg-white hover:text-sky-600">
                <Settings className="w-3 h-3" />
                Settings
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-center gap-2 text-slate-500 text-[10px] h-8 hover:bg-red-50 hover:text-red-600"
              onClick={logout}
            >
              <LogOut className="w-3 h-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span>Modules</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium capitalize">
              {location.pathname.split("/")[1] || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, reports..."
                className="w-64 pl-9 pr-4 py-1.5 text-sm bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-sky-500 transition-all outline-none"
              />
              {searchQuery.trim() && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                  {searching ? (
                    <div className="p-4 text-center text-sm text-slate-400">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">No results found</div>
                  ) : (
                    <div className="py-2">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Patients</div>
                      {searchResults.map((r: any) => (
                        <button
                          key={r.id}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                          onClick={() => { navigate(`/patients`); setSearchQuery(""); setSearchResults([]); }}
                        >
                          <span className="font-medium text-slate-900">{r.first_name} {r.last_name}</span>
                          <span className="text-xs text-slate-400 font-mono">{r.patient_id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button className="relative p-1 text-slate-400 hover:text-sky-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 focus:outline-none">
          <div className="max-w-full mx-auto space-y-6 pb-12">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="h-8 bg-slate-100 border-t border-slate-200 px-8 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
          <div className="flex gap-4">
            <span>System Status: <span className="text-green-600 font-semibold">Operational</span></span>
            <span>Server Load: 12%</span>
          </div>
          <div>© {new Date().getFullYear()} iCare HIMS. Enterprise v2.4.1</div>
        </footer>
      </main>
    </div>
  );
};

export default DashboardLayout;
