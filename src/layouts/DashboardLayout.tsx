import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGlobalSettings } from "../context/GlobalSettingsContext";
import { supabase } from "@/src/lib/supabase";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Pill,
  Bed,
  UserPlus,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  X,
  Scan,
  Calculator,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const SidebarItem = ({ icon: Icon, label, href, active, onClick }: any) => (
  <Link
    to={href}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
      active
        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500 shadow-sm"
        : "text-slate-600 hover:bg-blue-50/40 hover:text-blue-600"
    )}
  >
    {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
    <span>{label}</span>
  </Link>
);

const SidebarGroup = ({ icon: Icon, label, children, currentPath, isOpen, onToggle }: any) => {
  const isChildActive = (href: string) => {
    if (currentPath === href) return true;
    if (currentPath.startsWith(href + "/")) {
      const moreSpecific = children.find(
        (c: any) => c.href !== href && currentPath.startsWith(c.href)
      );
      return !moreSpecific;
    }
    return false;
  };
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium w-full text-left",
          "text-slate-600 hover:bg-blue-50/40 hover:text-blue-600"
        )}
      >
        {Icon && <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />}
        <span className="flex-1">{label}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-blue-200 pl-3">
          {children.map((child: any) => (
            <SidebarItem
              key={child.href}
              href={child.href}
              label={child.label}
              active={isChildActive(child.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { settings } = useGlobalSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(
    localStorage.getItem("staff_profile_picture") || ""
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const navItems = useMemo(() => {
    const all: any[] = [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: Calendar, label: "Appointments", href: "/appointments" },
      { icon: Users, label: "Patients", children: [
        { label: "All Patients", href: "/patients" },
        { label: "Individual", href: "/patients/individual" },
        { label: "Family", href: "/patients/family" },
        { label: "Corporate", href: "/patients/corporate" },
        { label: "HMO", href: "/patients/hmo" },
      ]},
      { icon: ClipboardList, label: "Consultations", children: [
        { label: "Vital Signs", href: "/consultations/vitals" },
        { label: "Clinical Workspace", href: "/consultations" },
      ]},
      { icon: FlaskConical, label: "Laboratory", href: "/laboratory" },
      { icon: Scan, label: "Radiology", href: "/radiology" },
      { icon: Pill, label: "Pharmacy", children: [
        { label: "Prescription", href: "/pharmacy/prescriptions" },
        { label: "Inventory", href: "/pharmacy/inventory" },
        { label: "Analytics", href: "/pharmacy/analytics" },
      ]},
      { icon: Bed, label: "Inpatient", href: "/inpatient" },
      { icon: CreditCard, label: "Billing", href: "/billing" },
      { icon: Calculator, label: "Accounting", children: [
        { label: "Hub", href: "/accounting" },
        { label: "Registries", href: "/accounting/registries" },
        { label: "General Ledger", href: "/accounting/ledger" },
        { label: "Banks", href: "/accounting/banks" },
        { label: "Reports", href: "/accounting/reports" },
      ]},
      { icon: UserPlus, label: "Staff", href: "/staff" },
      { icon: BarChart3, label: "Reports", children: [
        { label: "Analytics Hub", href: "/reports" },
        { label: "Clinical", href: "/reports/clinical" },
        { label: "Staff", href: "/reports/staff" },
      ]},
      { icon: Settings, label: "System Settings", href: "/settings" },
    ];

    if (!user?.role) return all;

    const matrix = settings.rbacMatrix;
    const roleKey = user.role as keyof typeof matrix;
    const perm = matrix[roleKey];
    if (!perm || perm.allowedRoutes.length === 0) return all;

    const baseRoutes = perm.allowedRoutes;
    const overrides = settings.staffRouteOverrides?.[user.id] || [];
    const effectiveRoutes = [...baseRoutes, ...overrides];

    const routeAllowed = (href: string) =>
      effectiveRoutes.some((r: string) => href === r || href.startsWith(r + "/"));

    return all.filter((item: any) => {
      if (item.children) {
        return item.children.some((c: any) => routeAllowed(c.href));
      }
      return routeAllowed(item.href);
    });
  }, [user?.role, settings.rbacMatrix, settings.staffRouteOverrides]);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const activeGroup = navItems.find((item: any) =>
      item.children?.some((c: any) =>
        c.href === "/" ? location.pathname === "/" : location.pathname.startsWith(c.href)
      )
    );
    return activeGroup?.label || null;
  });

  useEffect(() => {
    if (expandedGroup === null) {
      const activeGroup = navItems.find((item: any) =>
        item.children?.some((c: any) =>
          c.href === "/" ? location.pathname === "/" : location.pathname.startsWith(c.href)
        )
      );
      if (activeGroup) setExpandedGroup(activeGroup.label);
    }
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      setProfilePic((e as CustomEvent).detail || "");
    };
    window.addEventListener("profile-picture-updated", handler as EventListener);
    return () =>
      window.removeEventListener("profile-picture-updated", handler as EventListener);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-blue-100 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center border-b border-blue-100">
          <img src="/logo.png" alt="iCare" className="h-9 w-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          <nav className="space-y-1">
            {navItems.map((item: any) =>
              item.children ? (
                <SidebarGroup
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  children={item.children}
                  currentPath={location.pathname}
                  isOpen={expandedGroup === item.label}
                  onToggle={() => setExpandedGroup(expandedGroup === item.label ? null : item.label)}
                />
              ) : (
                <SidebarItem
                  key={item.href}
                  {...item}
                  active={item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)}
                  onClick={() => setExpandedGroup(null)}
                />
              )
            )}
          </nav>
        </div>

                <div className="p-4 border-t border-blue-100 bg-blue-50/20">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group">
            <Avatar className="h-9 w-9 border border-slate-200 group-hover:border-sky-200 overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback className="bg-white text-sky-600 text-xs font-bold">
                  {user?.fullName?.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 mt-4"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-auto min-h-16 bg-white border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-8 py-2 sm:py-0 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="p-6 flex items-center border-b border-blue-100">
                  <img src="/logo.png" alt="iCare" className="h-9 w-auto" />
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <nav className="space-y-1">
                    {navItems.map((item: any) =>
                      item.children ? (
                        <SidebarGroup
                          key={item.label}
                          icon={item.icon}
                          label={item.label}
                          children={item.children}
                          currentPath={location.pathname}
                          isOpen={expandedGroup === item.label}
                          onToggle={() => setExpandedGroup(expandedGroup === item.label ? null : item.label)}
                        />
                      ) : (
                        <SidebarItem
                          key={item.href}
                          {...item}
                          active={item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)}
                          onClick={() => setExpandedGroup(null)}
                        />
                      )
                    )}
                  </nav>
                </div>
        <div className="p-4 border-t border-blue-100 bg-blue-50/20">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
                  >
            <Avatar className="h-9 w-9 border border-slate-200 group-hover:border-blue-300 overflow-hidden">
                      {profilePic ? (
                        <img src={profilePic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-white text-sky-600 text-xs font-bold">
                          {user?.fullName?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
                      <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 mt-4"
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setSearchResults([]); (e.target as HTMLInputElement).blur(); } }}
                placeholder="Search patients, reports..."
                className="w-40 sm:w-64 pl-9 pr-10 py-1.5 text-sm bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-blue-400 transition-all outline-none"
              />
              {searchQuery.trim() && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {searchQuery.trim() && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
            
            <button className="relative p-1 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
              {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 focus:outline-none">
          <div className="max-w-full mx-auto space-y-6 pb-12">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="h-8 bg-blue-50/40 border-t border-blue-100 px-8 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
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
