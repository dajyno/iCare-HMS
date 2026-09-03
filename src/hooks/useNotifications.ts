import { useState, useEffect, useCallback } from "react";
import { supabase, toCamel } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import { useAuth } from "@/src/context/AuthContext";
import { useGlobalSettings } from "@/src/context/GlobalSettingsContext";
import { toast } from "sonner";
import type { AppNotification } from "@/src/lib/types";

const POLL_INTERVAL = 5 * 60 * 1000;

export function useNotifications(active = false) {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(count || 0);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return;
    }

    const next = toCamel(data) as AppNotification[];
    setNotifications(next);
    setUnreadCount(next.filter((n) => !n.isRead).length);
    setLoading(false);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [user]);

  const ensureNotification = useCallback(
    async (title: string, message: string, type: "Info" | "Warning" | "Alert", link?: string) => {
      if (!user) return;

      const { data: existing } = await supabase
        .from("notifications")
        .select("id, message")
        .eq("user_id", user.id)
        .eq("title", title)
        .order("created_at", { ascending: false })
        .limit(1);

      const row = existing && existing.length > 0 ? existing[0] : null;

      if (row) {
        if (row.message !== message) {
          await adminSupabase
            .from("notifications")
            .update({
              message,
              created_at: new Date().toISOString(),
              ...(link !== undefined && { link }),
            })
            .eq("id", row.id);
          fetchNotifications();
        }
        return;
      }

      const { error } = await adminSupabase.from("notifications").insert({
        user_id: user.id,
        title,
        message,
        type,
        ...(link !== undefined && { link }),
      });

      if (!error) {
        if (type === "Warning") {
          toast.warning(message);
        } else if (type === "Alert") {
          toast.error(message);
        } else {
          toast.info(message);
        }
        fetchNotifications();
      }
    },
    [user, fetchNotifications]
  );

  const checkPendingTransactions = useCallback(async () => {
    if (!settings.pendingTransactionAlerts || !user) return;

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id")
      .eq("status", "Unpaid")
      .limit(1);

    if (error || !invoices || invoices.length === 0) return;

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "Unpaid");

    const c = count ?? 1;
    ensureNotification(
      "Pending Transactions",
      `${c} invoice${c !== 1 ? "s" : ""} awaiting payment`,
      "Info",
      "/billing"
    );
  }, [settings.pendingTransactionAlerts, user, ensureNotification]);

  const checkLowStock = useCallback(async () => {
    if (!settings.lowStockAlerts || !user) return;

    const { data: meds, error } = await supabase
      .from("medications")
      .select("id, name, quantity_in_stock, reorder_level")
      .eq("status", "available");

    if (error || !meds) return;

    const lowStock = (meds as any[]).filter(
      (m) => m.quantity_in_stock <= m.reorder_level
    );

    if (lowStock.length === 0) return;

    const names = lowStock.slice(0, 5).map((m) => m.name).join(", ");
    const more = lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : "";

    ensureNotification(
      "Low Stock Alert",
      `${lowStock.length} item${lowStock.length !== 1 ? "s" : ""} below reorder level: ${names}${more}`,
      "Warning",
      "/pharmacy/inventory"
    );
  }, [settings.lowStockAlerts, user, ensureNotification]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    if (!active) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
      return () => clearInterval(interval);
    }

    setLoading(true);
    fetchNotifications();
    checkPendingTransactions();
    checkLowStock();

    const interval = setInterval(() => {
      fetchNotifications();
      checkPendingTransactions();
      checkLowStock();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user, active, fetchUnreadCount, fetchNotifications, checkPendingTransactions, checkLowStock]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
