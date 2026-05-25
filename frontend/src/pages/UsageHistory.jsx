import { useEffect, useMemo, useState } from "react";
import { fetchAnalyticsHistory } from "../api/analyticsApi";
import { fetchBillingSummary } from "../api/billingApi";
import { fetchLiveDashboard } from "../api/dashboardApi";
import { fetchDevices } from "../api/devicesApi";
import { generateUsageInsights } from "../api/insightsApi";
import { BarChart3, CalendarClock, IndianRupee, Leaf, Sun } from "lucide-react";
import PageHeader from "../components/PageHeader";
import AiUsageSummaryModal, { AiUsageSummaryButton } from "../features/history/AiUsageSummary";
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
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsPeriod, setInsightsPeriod] = useState(null);
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

  const insightInputReady = useMemo(
    () => !loading && data.length > 0 && billing && dashboard && Array.isArray(devices),
    [billing, dashboard, data, devices, loading]
  );

  useEffect(() => {
    if (!summaryOpen) {
      return undefined;
    }

    if (!insightInputReady) {
      setInsights(null);
      setInsightsLoading(true);
      return undefined;
    }

    if (insights && insightsPeriod === period) {
      setInsightsLoading(false);
      setInsightsError(null);
      return undefined;
    }

    const controller = new AbortController();
    setInsightsLoading(true);
    setInsightsError(null);

    generateUsageInsights({
      period,
      analytics: data,
      billing,
      devices,
      dashboard,
      signal: controller.signal,
    })
      .then((result) => {
        setInsights(result);
        setInsightsPeriod(period);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setInsightsError(err.message || "Unable to generate AI summary right now.");
      })
      .finally(() => setInsightsLoading(false));

    return () => controller.abort();
  }, [billing, dashboard, data, devices, insightInputReady, insights, insightsPeriod, period, summaryOpen]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Usage History"
          subtitle="See how your home used grid and solar power over time."
        />
        <div data-tour="history-filters">
          <PeriodToggle options={["daily", "weekly", "monthly"]} selected={period} onChange={setPeriod} />
        </div>
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
            headerAction={<AiUsageSummaryButton period={period} onClick={() => setSummaryOpen(true)} />}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            <span>No usage data available for the selected period.</span>
          </div>
        )}
      </div>

      <AiUsageSummaryModal
        period={period}
        insights={insights}
        loading={insightsLoading}
        error={insightsError}
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />
    </div>
  );
}
