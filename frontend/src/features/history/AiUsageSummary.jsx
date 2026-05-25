import { useEffect } from "react";
import { BrainCircuit, Lightbulb, PiggyBank, TrendingUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function shortenText(value, maxLength = 118) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${clipped}.`;
}

function InsightCard({ icon: Icon, title, children, tone, index = 0 }) {
  return (
    <div
      className="ai-summary-card rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-zinc-600 hover:shadow-[0_16px_44px_rgba(0,0,0,0.55)]"
      style={{ "--summary-delay": `${index * 140}ms` }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
          <Icon size={21} />
        </span>
        <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">{title}</p>
      </div>
      <div className="space-y-3 text-sm leading-7 text-zinc-300">{children}</div>
    </div>
  );
}

export function AiUsageSummaryButton({ period, onClick }) {
  return (
    <button
      data-tour="history-ai-summary"
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] px-4 py-2 text-sm font-bold text-[var(--volt-yellow)] transition-colors hover:bg-[rgba(234,179,8,0.22)]"
    >
      <BrainCircuit size={16} />
      <span>AI Summary</span>
    </button>
  );
}

export default function AiUsageSummaryModal({ period, insights, loading, error, open, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)]">
              <BrainCircuit size={21} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-[var(--volt-yellow)]">AI Summary</h2>
              <p className="text-sm text-zinc-400">Quick read for this {period} view.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Close AI summary"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-zinc-800 bg-black/20">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--volt-yellow)]" />
              <p className="text-sm text-zinc-400">Putting together your latest energy summary...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5 text-sm text-zinc-400">
            The summary is not available right now. Your usage data is still visible in the chart, and we can refresh this again in a moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <InsightCard
              icon={TrendingUp}
              title="What Happened"
              tone="bg-violet-500/10 text-violet-300 ring-violet-500/20"
              index={0}
            >
              <p>{shortenText(insights.whatHappened)}</p>
            </InsightCard>

              <InsightCard
                icon={PiggyBank}
                title="Savings"
                tone="bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                index={1}
              >
              <p>{shortenText(insights.billSavings)}</p>
              <p className="rounded-xl border border-zinc-800 bg-black/25 px-4 py-3 text-zinc-300">
                {shortenText(insights.futureOutlook, 100)}
              </p>
            </InsightCard>

              <InsightCard
                icon={Lightbulb}
                title="What To Do Next"
                tone="bg-orange-500/10 text-orange-300 ring-orange-500/20"
                index={2}
              >
              <ul className="space-y-3">
                {insights.deviceSuggestions.slice(0, 2).map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--volt-yellow)]" />
                    <span>{shortenText(item, 104)}</span>
                  </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/devices");
                    }}
                    className="rounded-xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] px-3 py-2 text-xs font-bold text-[var(--volt-yellow)] transition-colors hover:bg-[rgba(234,179,8,0.22)]"
                  >
                    Open Smart Control
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/billing");
                    }}
                    className="rounded-xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] px-3 py-2 text-xs font-bold text-[var(--volt-yellow)] transition-colors hover:bg-[rgba(234,179,8,0.22)]"
                  >
                    Check Billing
                  </button>
                </div>
              </InsightCard>
            </div>
          )}
      </div>
    </div>
  );
}
