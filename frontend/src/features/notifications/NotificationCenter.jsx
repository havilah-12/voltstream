import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, Trash2, X } from "lucide-react";
import { useNotifications } from "./notificationStore";
import ThemedTooltip from "../../components/ThemedTooltip";

const centerTone = {
  success: { icon: CheckCircle2, iconTone: "text-emerald-300", dot: "bg-emerald-400" },
  warning: { icon: AlertTriangle, iconTone: "text-[var(--volt-yellow)]", dot: "bg-[var(--volt-yellow)]" },
  error: { icon: AlertTriangle, iconTone: "text-red-300", dot: "bg-red-400" },
  info: { icon: Info, iconTone: "text-sky-300", dot: "bg-sky-400" },
};

function formatNotificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, clearNotifications, removeNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [open]);

  const toggleMenu = () => {
    if (!open) markAllRead();
    setOpen((current) => !current);
  };

  return (
    <div ref={menuRef} className="relative">
      <ThemedTooltip label={open ? "" : "Notifications"}>
        <button
          type="button"
          data-tour="notification-bell"
          onClick={toggleMenu}
          className={`relative flex h-8 w-8 items-center justify-center rounded-xl border text-zinc-400 transition-colors ${
            open
              ? "border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)]"
              : "border-zinc-800 hover:border-[var(--volt-yellow-border)] hover:bg-[var(--volt-yellow-soft)] hover:text-[var(--volt-yellow)]"
          }`}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--volt-yellow)] px-1 text-[9px] font-black text-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </ThemedTooltip>

      {open ? (
        <div className="absolute right-0 top-12 z-[230] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-white">Notifications</h2>
              <p className="text-xs font-semibold text-zinc-500">{notifications.length ? `${notifications.length} recent alerts` : "All clear"}</p>
            </div>
            <button
              type="button"
              onClick={clearNotifications}
              disabled={!notifications.length}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Clear notifications"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length ? (
              notifications.map((notification) => {
                const config = centerTone[notification.type] ?? centerTone.info;
                const Icon = config.icon;
                return (
                  <div key={notification.id} className="flex gap-3 border-b border-zinc-900 px-4 py-3 last:border-b-0">
                    {!notification.read ? (
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                    ) : (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                    )}
                    <Icon size={18} className={`mt-0.5 shrink-0 ${notification.read ? "text-zinc-700" : config.iconTone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm font-bold ${notification.read ? "text-zinc-500" : "text-white"}`}>{notification.title}</p>
                        <span className={`shrink-0 text-[11px] font-semibold ${notification.read ? "text-zinc-700" : "text-zinc-600"}`}>
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      {notification.message ? (
                        <p className={`mt-1 text-xs font-semibold leading-5 ${notification.read ? "text-zinc-600" : "text-zinc-400"}`}>{notification.message}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNotification(notification.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm font-semibold text-zinc-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
