// Used by App.jsx as the shared shell for every route page.
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, BarChart3, Settings2, Receipt, Zap, User } from "lucide-react";

export default function Layout() {
  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Usage History", path: "/analytics", icon: <BarChart3 size={18} /> },
    { name: "Smart Control", path: "/devices", icon: <Settings2 size={18} /> },
    { name: "Billing", path: "/billing", icon: <Receipt size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-black text-[var(--volt-yellow)]">
      <header className="bg-zinc-950 border-b border-zinc-800 shadow-sm">
        <div className="app-shell flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--volt-yellow)] text-black p-2 rounded-lg">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--volt-yellow)]">VoltStream</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Usage monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `font-display flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
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
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-sm">
              <div className="bg-[var(--volt-yellow)] text-black rounded-full p-2">
                <User size={16} />
              </div>
              <span className="font-display font-semibold text-[var(--volt-yellow)]">Prosumer</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto py-8">
        <div className="app-shell">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
