import { useNavigate } from "react-router-dom";
import { BarChart3, Bot, ChevronRight, IndianRupee, Settings2, Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const nextSteps = [
  {
    title: "Check live energy",
    text: "See current grid power, solar power, bill savings, and eco impact.",
    icon: BarChart3,
  },
  {
    title: "Control devices",
    text: "View appliance usage and turn selected devices on or off.",
    icon: Settings2,
  },
  {
    title: "Understand bills",
    text: "Track generated bill, payable bill, solar credit, and budget status.",
    icon: IndianRupee,
  },
  {
    title: "Ask the assistant",
    text: "Get simple explanations for solar surplus, grid draw, and platform terms.",
    icon: Bot,
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const enterPlatform = () => {
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-black px-4 py-8 text-white">
      <section className="mx-auto max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--volt-yellow-border)] bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),transparent_35%),#18181b] p-7 shadow-2xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--volt-yellow)] text-black">
            <Zap size={34} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">Welcome to VoltStream</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[var(--volt-yellow)]">
              Hi{user?.name ? `, ${user.name}` : ""}.
            </h1>
          </div>
        </div>

        <p className="max-w-3xl text-base font-semibold leading-8 text-zinc-200">
          Your dashboard is ready. VoltStream will help you monitor live power, compare solar and grid usage, manage smart devices, and understand how energy usage affects your bill.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {nextSteps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border border-zinc-800 bg-black/30 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)]">
                  <Icon size={22} />
                </div>
                <h2 className="font-display text-base font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-400">{item.text}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={enterPlatform}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--volt-yellow)] px-5 font-bold text-black transition-colors hover:brightness-110"
          >
            Get Into Platform
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
