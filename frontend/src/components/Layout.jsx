// Used by App.jsx as the shared shell for every route page.
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bot, LayoutDashboard, BarChart3, LogOut, Settings2, Receipt, Zap, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import GuidedTour from "./GuidedTour";
import QuickAssistant from "./QuickAssistant";
import ThemedTooltip from "./ThemedTooltip";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Usage History", path: "/analytics", icon: <BarChart3 size={18} /> },
    { name: "Smart Control", path: "/devices", icon: <Settings2 size={18} /> },
    { name: "Billing", path: "/billing", icon: <Receipt size={18} /> },
    { name: "Assistant", path: "/chat", icon: <Bot size={18} /> },
  ];
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-[var(--volt-yellow)]">
      <header className="bg-zinc-950 border-b border-zinc-800 shadow-sm">
        <div className="app-shell flex flex-col gap-4 py-4 md:flex-row md:h-20 md:items-center md:justify-between">
          <div data-tour="brand" className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="bg-[var(--volt-yellow)] text-black p-2 rounded-lg shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--volt-yellow)]">VoltStream</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Usage monitoring</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-3">
            <nav data-tour="main-nav" className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-1 md:justify-end">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `font-display flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] shadow-sm border border-[var(--volt-yellow-border)]"
                        : "text-zinc-400 hover:text-[var(--volt-yellow)] hover:bg-zinc-900"
                    }`
                  }
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div data-tour="user-menu" className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-sm md:ml-auto">
              <div className="bg-[var(--volt-yellow)] text-black rounded-full p-2">
                <User size={16} />
              </div>
              <span className="font-display font-semibold text-[var(--volt-yellow)]">{user?.name ?? "Prosumer"}</span>
              <ThemedTooltip label="Logout">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </ThemedTooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto py-8">
        <div data-tour="page-overview" className="app-shell">
          <Outlet />
        </div>
      </main>
      <GuidedTour />
      {location.pathname !== "/chat" ? <QuickAssistant /> : null}
    </div>
  );
}
