import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("prosumer@voltstream.app");
  const [password, setPassword] = useState("voltstream");
  const redirectTo = location.state?.from?.pathname ?? "/";

  const handleSubmit = (event) => {
    event.preventDefault();
    login({ email, password });
    navigate(redirectTo, { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--volt-yellow)] p-3 text-black">
            <Zap size={26} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--volt-yellow)]">VoltStream</h1>
            <p className="text-sm font-semibold text-zinc-500">Sign in to your energy dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-white outline-none focus:border-[var(--volt-yellow)]"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-white outline-none focus:border-[var(--volt-yellow)]"
              required
            />
          </div>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] font-bold text-black transition-colors hover:brightness-110"
          >
            <LogIn size={18} />
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold text-zinc-500">
          New to VoltStream?{" "}
          <Link to="/signup" className="text-[var(--volt-yellow)] hover:underline">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
