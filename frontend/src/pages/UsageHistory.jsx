import { useEffect, useMemo, useState } from "react";
import { fetchAnalyticsHistory } from "../api/analyticsApi";
import { fetchBillingSummary } from "../api/billingApi";
import { fetchLiveDashboard } from "../api/dashboardApi";
import { fetchDevices } from "../api/devicesApi";
import { Network, BarChart3, Sun, Leaf, IndianRupee, CalendarClock, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import AgentWorkflowChat from "../features/history/AgentWorkflowChat";
import PeriodToggle from "../features/history/PeriodToggle";
import BarChartPanel from "../features/history/BarChartPanel";

function getBillOutlook(summary, periodGridUsage, periodSolarUsage) {
  const gridUsage = Number(summary?.current_grid_data_usage) || 0;
  const projectedBill = Number(summary?.projected_bill) || 0;
  const gridUnitRate = gridUsage > 0 ? projectedBill / gridUsage : 0;
  const grossBill = periodGridUsage * gridUnitRate;
  const solarCredit = periodSolarUsage * gridUnitRate;

  return Math.max(grossBill - solarCredit, 0);
}

export default function UsageHistory() {
  const [period, setPeriod] = useState("daily");


  const [data, setData] = useState([]);
  const [billing, setBilling] = useState(null);
  const [devices, setDevices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAnalyticsHistory(period)
      .then((result) => setData(result ?? []))
      .catch((err) => setError(err.message || "Unable to load usage history."))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([fetchBillingSummary(), fetchDevices(), fetchLiveDashboard()]).then((results) => {
      if (cancelled) return;
      setBilling(results[0].status === "fulfilled" ? results[0].value : {});
      setDevices(results[1].status === "fulfilled" ? results[1].value ?? [] : []);
      setDashboard(results[2].status === "fulfilled" ? results[2].value : {});
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalGrid = data.reduce((sum, item) => sum + Number(item.grid ?? 0), 0);
  const totalSolar = data.reduce((sum, item) => sum + Number(item.solar ?? 0), 0);
  const solarCoverage = totalGrid > 0 ? Math.round((totalSolar / totalGrid) * 100) : 0;
  const peakGrid = data.reduce(
    (peak, item) => (Number(item.grid ?? 0) > Number(peak.grid ?? 0) ? item : peak),
    data[0] ?? {}
  );
  const billOutlook = getBillOutlook(billing, totalGrid, totalSolar);
  const billOutlookLabel = {
    daily: "Average daily bill",
    weekly: "Average weekly bill",
    monthly: "Average monthly bill",
  }[period];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage History"
        subtitle="See how your home used grid and solar power over time."
      />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div data-tour="history-filters" className="shrink-0">
          <PeriodToggle options={["daily", "weekly", "monthly"]} selected={period} onChange={setPeriod} />
        </div>
        <button
          data-tour="history-ai-summary"
          type="button"
          onClick={() => setSummaryOpen(true)}
          className="group relative flex min-h-[56px] flex-1 items-center justify-between overflow-hidden rounded-xl border border-[var(--volt-yellow-border)] bg-[#1c1603] px-4 py-2 text-sm font-semibold text-white outline-none transition-all hover:border-[var(--volt-yellow)] hover:bg-[#261f05] hover:shadow-[0_0_18px_rgba(234,179,8,0.14)] focus:border-[var(--volt-yellow)] focus:bg-[#261f05] focus:shadow-[0_0_18px_rgba(234,179,8,0.14)]"
        >
          {/* Floating Energy Icons Background */}
          <div className="absolute inset-y-0 right-0 z-0 pointer-events-none flex items-center justify-end gap-7 pr-14 opacity-10">
            <Zap className="animate-[bounce_2s_infinite] text-[var(--volt-yellow)]" size={26} />
            <Sun className="animate-[spin_4s_linear_infinite] text-orange-400" size={28} />
            <Leaf className="animate-[bounce_3s_infinite] text-emerald-400" size={26} />
            <Zap className="animate-[pulse_1.5s_infinite] text-[var(--volt-yellow)] hidden sm:block" size={24} />
            <Sun className="animate-[spin_3s_linear_infinite] text-orange-400 hidden md:block" size={24} />
          </div>
          
          <div className="relative z-10 flex items-center gap-3 text-[var(--volt-yellow)] transition-colors">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--volt-yellow)] text-black shadow-[0_0_8px_rgba(234,179,8,0.35)]">
              <Network size={19} />
            </span>
            <span className="font-display truncate text-base font-bold uppercase tracking-wider text-shadow-sm sm:text-lg">
              Smart Advisor
            </span>
          </div>
          <div className="relative z-10 hidden h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--volt-yellow)] px-4 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_8px_rgba(234,179,8,0.35)] sm:flex">
            Ask
          </div>
        </button>
      </div>

      {!loading && !error && data.length > 0 ? (
        <section data-tour="history-summary" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                <BarChart3 size={22} />
              </span>
              <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Grid Power Used</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#a78bfa]">{totalGrid.toFixed(0)} kWh</p>
            <p className="mt-1 text-sm text-zinc-500">Total grid energy in this {period} view</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20">
                <Sun size={22} />
              </span>
              <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Solar Generated</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#fb923c]">{totalSolar.toFixed(0)} kWh</p>
            <p className="mt-1 text-sm text-zinc-500">Solar contribution in the same period</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
                <Leaf size={22} />
              </span>
              <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Solar Help</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{solarCoverage}%</p>
            <p className="mt-1 text-sm text-zinc-500">How much of your usage solar helped cover</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)]">
                <IndianRupee size={22} />
              </span>
              <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Bill Outlook</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">₹{billOutlook.toFixed(0)}</p>
            <p className="mt-1 text-sm text-zinc-500">{billOutlookLabel}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)]">
                <CalendarClock size={22} />
              </span>
              <p className="font-display text-lg font-semibold text-[var(--volt-yellow)]">Highest Grid Use</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{peakGrid.label ?? "--"}</p>
            <p className="mt-1 text-sm text-zinc-500">{Number(peakGrid.grid ?? 0).toFixed(0)} kWh was your highest grid use point</p>
          </div>
        </section>
      ) : null}

      <div data-tour="history-chart" className="h-[500px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--volt-yellow)]"></div>
          </div>
        ) : data.length > 0 ? (
          <BarChartPanel
            data={data}
            className="h-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            <span>No usage data available for the selected period.</span>
          </div>
        )}
      </div>

      <AgentWorkflowChat open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}
