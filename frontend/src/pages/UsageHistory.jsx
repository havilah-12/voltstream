import { useEffect, useState } from "react";
import { fetchAnalyticsHistory } from "../api";
import PageHeader from "../components/PageHeader";
import PeriodToggle from "../features/history/PeriodToggle";
import BarChartPanel from "../features/history/BarChartPanel";

export default function UsageHistory() {
  const [period, setPeriod] = useState("daily");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAnalyticsHistory(period)
      .then((result) => setData(result ?? []))
      .catch((err) => setError(err.message || "Unable to load usage history."))
      .finally(() => setLoading(false));
  }, [period]);

  const totalGrid = data.reduce((sum, item) => sum + Number(item.grid ?? 0), 0);
  const totalSolar = data.reduce((sum, item) => sum + Number(item.solar ?? 0), 0);
  const solarCoverage = totalGrid > 0 ? Math.round((totalSolar / totalGrid) * 100) : 0;
  const peakGrid = data.reduce(
    (peak, item) => (Number(item.grid ?? 0) > Number(peak.grid ?? 0) ? item : peak),
    data[0] ?? {}
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Usage History"
          subtitle="Track grid consumption and solar generation over time."
        />
        <PeriodToggle options={["daily", "weekly", "monthly"]} selected={period} onChange={setPeriod} />
      </div>

      {!loading && !error && data.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Historical Grid Use</p>
            <p className="mt-2 text-2xl font-bold text-white">{totalGrid.toFixed(0)} kWh</p>
            <p className="mt-1 text-sm text-zinc-500">Total grid energy for this {period} view</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Solar Generated</p>
            <p className="mt-2 text-2xl font-bold text-[var(--volt-yellow)]">{totalSolar.toFixed(0)} kWh</p>
            <p className="mt-1 text-sm text-zinc-500">Solar contribution in the same period</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Solar Coverage</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{solarCoverage}%</p>
            <p className="mt-1 text-sm text-zinc-500">How much grid usage solar helped offset</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Peak Grid Period</p>
            <p className="mt-2 text-2xl font-bold text-white">{peakGrid.label ?? "--"}</p>
            <p className="mt-1 text-sm text-zinc-500">{Number(peakGrid.grid ?? 0).toFixed(0)} kWh was the highest grid use</p>
          </div>
        </section>
      ) : null}

      <div className="h-[500px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--volt-yellow)]"></div>
          </div>
        ) : data.length > 0 ? (
          <BarChartPanel data={data} className="h-full" />
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            <span>No usage data available for the selected period.</span>
          </div>
        )}
      </div>
    </div>
  );
}
