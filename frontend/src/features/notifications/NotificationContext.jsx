import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { NotificationContext } from "./notificationStore";

const toneConfig = {
  success: {
    icon: CheckCircle2,
    toast: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    iconTone: "text-emerald-300",
  },
  warning: {
    icon: AlertTriangle,
    toast: "border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)]",
    iconTone: "text-[var(--volt-yellow)]",
  },
  error: {
    icon: AlertTriangle,
    toast: "border-red-500/30 bg-red-500/10 text-red-100",
    iconTone: "text-red-300",
  },
  info: {
    icon: Info,
    toast: "border-sky-500/25 bg-sky-500/10 text-sky-100",
    iconTone: "text-sky-300",
  },
};

function createNotification({ type = "info", title, message, duration = 5000, silent = false }) {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return {
    id,
    type: toneConfig[type] ? type : "info",
    title,
    message,
    duration,
    silent,
    toastDismissed: silent,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((notification) => {
    const nextNotification = createNotification(notification);
    setNotifications((current) => [nextNotification, ...current].slice(0, 20));
    return nextNotification.id;
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, toastDismissed: true } : notification
      )
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      notify,
      dismissNotification,
      removeNotification,
      markAllRead,
      clearNotifications,
    }),
    [clearNotifications, dismissNotification, removeNotification, markAllRead, notifications, notify, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToasts notifications={notifications} onDismiss={dismissNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationToasts({ notifications, onDismiss }) {
  const visibleNotifications = notifications.filter((n) => !n.toastDismissed).slice(0, 3);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[240] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {visibleNotifications.map((notification) => {
        const config = toneConfig[notification.type] ?? toneConfig.info;
        const Icon = config.icon;
        return (
          <NotificationToast
            key={notification.id}
            notification={notification}
            config={config}
            Icon={Icon}
            onDismiss={onDismiss}
          />
        );
      })}
    </div>
  );
}

function NotificationToast({ notification, config, Icon, onDismiss }) {
  useNotificationTimer(notification, onDismiss);

  return (
    <div className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur ${config.toast}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`mt-0.5 shrink-0 ${config.iconTone}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{notification.title}</p>
          {notification.message ? <p className="mt-1 text-xs font-semibold opacity-80">{notification.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-current opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function useNotificationTimer(notification, onDismiss) {
  useEffect(() => {
    if (!notification.duration) return undefined;
    const timer = window.setTimeout(() => onDismiss(notification.id), notification.duration);
    return () => window.clearTimeout(timer);
  }, [notification.duration, notification.id, onDismiss]);
}
