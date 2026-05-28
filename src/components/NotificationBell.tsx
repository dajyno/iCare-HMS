import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, Check, Info, AlertTriangle, AlertCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/src/hooks/useNotifications";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "Warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "Alert":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { hospital_slug } = useParams<{ hospital_slug: string }>();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="relative p-1 text-slate-400 hover:text-blue-600 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 py-4 px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.link) navigate(`/${hospital_slug}${n.link}`);
                    if (!n.isRead) markAsRead(n.id);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 ${
                    !n.isRead ? "bg-blue-50/30" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!n.isRead ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-xs text-center text-slate-400 hover:text-slate-600 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
