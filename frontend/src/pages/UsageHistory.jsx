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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Usage History"
          subtitle="Track grid consumption and solar generation over time."
        />
        <PeriodToggle options={["daily", "weekly", "monthly"]} selected={period} onChange={setPeriod} />
      </div>

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
