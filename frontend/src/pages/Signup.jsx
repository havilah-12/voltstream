import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, IndianRupee, Leaf, UserPlus, Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Prosumer");
  const [email, setEmail] = useState("prosumer@voltstream.app");
  const [password, setPassword] = useState("voltstream");

  const handleSubmit = (event) => {
    event.preventDefault();
    signup({ name, email, password });
    navigate("/welcome", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <section className="grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <aside className="signup-card-animate rounded-3xl border border-[var(--volt-yellow-border)] bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),transparent_36%),#18181b] p-7 shadow-xl" style={{ "--signup-card-delay": "0ms" }}>
          <div className="signup-reveal mb-6 flex items-center gap-3" style={{ "--signup-reveal-delay": "0ms" }}>
            <div className="signup-hero-icon rounded-2xl bg-[var(--volt-yellow)] p-3 text-black">
              <Zap size={28} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--volt-yellow)]">Why VoltStream?</h1>
              <p className="text-sm font-semibold text-zinc-400">Smart household energy usage monitoring.</p>
            </div>
          </div>
          <p
            className="signup-reveal max-w-2xl text-base font-semibold leading-8 text-zinc-200"
            style={{ "--signup-reveal-delay": "120ms" }}
          >
            VoltStream is for your household energy monitoring. It helps you see how much power comes from the grid, how much solar is generated, which smart devices are using energy, and how all of that affects your monthly bill.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="signup-reveal rounded-2xl border border-zinc-800 bg-black/30 p-4"
              style={{ "--signup-reveal-delay": "260ms" }}
            >
              <div className="signup-feature-icon signup-feature-icon-usage mb-3">
                <BarChart3 size={24} />
              </div>
              <h2 className="font-display text-sm font-semibold text-white">Live Usage</h2>
              <p className="mt-2 text-sm text-zinc-500">Track grid and solar power in one dashboard.</p>
            </div>
            <div
              className="signup-reveal rounded-2xl border border-zinc-800 bg-black/30 p-4"
              style={{ "--signup-reveal-delay": "380ms" }}
            >
              <div className="signup-feature-icon signup-feature-icon-bill mb-3">
                <IndianRupee size={24} />
              </div>
              <h2 className="font-display text-sm font-semibold text-white">Bill Savings</h2>
              <p className="mt-2 text-sm text-zinc-500">Understand how usage changes your bill.</p>
            </div>
            <div
              className="signup-reveal rounded-2xl border border-zinc-800 bg-black/30 p-4"
              style={{ "--signup-reveal-delay": "500ms" }}
            >
              <div className="signup-feature-icon signup-feature-icon-eco mb-3">
                <Leaf size={24} />
              </div>
              <h2 className="font-display text-sm font-semibold text-white">Eco Impact</h2>
              <p className="mt-2 text-sm text-zinc-500">See how solar reduces energy impact.</p>
            </div>
          </div>
        </aside>

        {/* Sign-up card with entry transition staggered */}
        <div className="signup-card-animate w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl" style={{ "--signup-card-delay": "300ms" }}>
          <div className="signup-reveal mb-8 flex items-center gap-3" style={{ "--signup-reveal-delay": "80ms" }}>
            <div className="rounded-2xl bg-[var(--volt-yellow)] p-3 text-black">
              <Zap size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--volt-yellow)]">Create Account</h1>
              <p className="text-sm font-semibold text-zinc-500">Start monitoring your smart energy flow</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="signup-reveal" style={{ "--signup-reveal-delay": "180ms" }}>
              <label className="mb-2 block text-sm font-bold text-zinc-400">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-white outline-none focus:border-[var(--volt-yellow)]"
                required
              />
            </div>
            <div className="signup-reveal" style={{ "--signup-reveal-delay": "280ms" }}>
              <label className="mb-2 block text-sm font-bold text-zinc-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-white outline-none focus:border-[var(--volt-yellow)]"
                required
              />
            </div>
            <div className="signup-reveal" style={{ "--signup-reveal-delay": "380ms" }}>
              <label className="mb-2 block text-sm font-bold text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-white outline-none focus:border-[var(--volt-yellow)]"
                required
              />
            </div>
            <div className="signup-reveal" style={{ "--signup-reveal-delay": "460ms" }}>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] font-bold text-black transition-colors hover:brightness-110"
              >
                <UserPlus size={18} />
                Sign Up
              </button>
            </div>
          </form>

          <p className="signup-reveal mt-6 text-center text-sm font-semibold text-zinc-500" style={{ "--signup-reveal-delay": "520ms" }}>
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--volt-yellow)] hover:underline">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
