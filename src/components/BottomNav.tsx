import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onMoreClick: () => void;
}

const tabs = [
  { icon: LayoutDashboard, label: "Dashboard", route: "dashboard" },
  { icon: Users, label: "Patients", route: "patients" },
  { icon: ClipboardList, label: "Consultation", route: "consultations" },
  { icon: User, label: "Profile", route: "profile" },
];

const BottomNav: React.FC<BottomNavProps> = ({ onMoreClick }) => {
  const location = useLocation();
  const { hospital_slug } = useParams();

  const p = (path: string) =>
    hospital_slug ? `/${hospital_slug}${path}` : path;

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const isMoreActive =
    location.pathname !== "/" &&
    !tabs.some((tab) => {
      const href = p(`/${tab.route}`);
      return location.pathname.startsWith(href);
    });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div
        className="flex items-center justify-around h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => {
          const href = p(`/${tab.route}`);
          const active = isActive(href);
          return (
            <Link
              key={tab.label}
              to={href}
              className="flex flex-col items-center justify-center min-h-[48px] flex-1 gap-0.5 px-1 py-1 no-underline"
            >
              <tab.icon
                className={cn(
                  "w-5 h-5",
                  active ? "text-blue-600" : "text-slate-400"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight text-center",
                  active ? "text-blue-600" : "text-slate-500"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center min-h-[48px] flex-1 gap-0.5 px-1 py-1 bg-transparent border-none cursor-pointer"
        >
          <MoreHorizontal
            className={cn(
              "w-5 h-5",
              isMoreActive ? "text-blue-600" : "text-slate-400"
            )}
            strokeWidth={isMoreActive ? 2.5 : 2}
          />
          <span
            className={cn(
              "text-[10px] font-semibold leading-tight text-center",
              isMoreActive ? "text-blue-600" : "text-slate-500"
            )}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
