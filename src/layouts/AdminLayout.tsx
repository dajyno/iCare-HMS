import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Platform Overview", href: "/admin" },
  { icon: Building2, label: "Hospital Accounts", href: "/admin/tenants" },
  { icon: CreditCard, label: "Subscription & Plans", href: "/admin/licensing" },
  { icon: Activity, label: "Infrastructure Health", href: "/admin/health" },
];

const AdminLayout: React.FC = () => {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(href);

  const handleNav = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#07070d] text-[#e8e8f0] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#0d0d1a] border-r border-[#1a1a35] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#1a1a35]">
          <h1 className="text-lg font-bold tracking-tight text-white">iCare SaaS</h1>
          <p className="text-[10px] text-[#8888aa] uppercase tracking-wider mt-1">Control Center</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 text-left",
                isActive(item.href)
                  ? "bg-[#0088ff]/10 text-[#0088ff] border-l-2 border-[#0088ff] rounded-l-none"
                  : "text-[#8888aa] hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1a1a35]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#0088ff] shadow-[0_0_12px_rgba(0,136,255,0.3)] flex items-center justify-center text-xs font-bold text-white">
              {admin?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">{admin?.name || "Admin"}</p>
              <p className="text-[10px] text-[#8888aa] uppercase">{admin?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs h-8 mt-2"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d1a] border-b border-[#1a1a35]">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#8888aa]">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-sm font-bold text-white">iCare SaaS</h1>
          <div className="w-6" />
        </header>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
            <div className="w-64 h-full bg-[#0d0d1a] p-4" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-1 mt-8">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNav(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 text-left",
                      isActive(item.href)
                        ? "bg-[#0088ff]/10 text-[#0088ff]"
                        : "text-[#8888aa] hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#07070d]">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
