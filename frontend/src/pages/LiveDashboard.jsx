import { useEffect, useState } from "react";
import { fetchLiveDashboard, fetchAnalyticsHistory, fetchDevices, fetchBillingSummary } from "../api";
import { Activity, Leaf, Sun, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import LineChartPanel from "../features/dashboard/LineChartPanel";
import PieChartPanel from "../features/dashboard/PieChartPanel";
import TopConsumersTable from "../features/dashboard/TopConsumersTable";

const fallbackLiveData = {
  grid_draw_kw: 2.4,
  solar_generation_kw: 3.1,
  net_usage_kw: -0.7,
};

const fallbackBilling = {
  projected_bill: 3200,
  current_grid_data_usage: 320,
  solar_energy_usage: 210,
};

const fallbackHistory = [
  { label: "00:00", grid: 1.1, solar: 0 },
  { label: "06:00", grid: 1.5, solar: 0.6 },
  { label: "09:00", grid: 2.1, solar: 2.4 },
  { label: "12:00", grid: 2.6, solar: 3.7 },
  { label: "15:00", grid: 2.3, solar: 3.4 },
  { label: "18:00", grid: 2.8, solar: 1.2 },
];

const fallbackDevices = [
  { id: "d1", name: "AC", status: "ON", power_usage_w: 1500 },
  { id: "d2", name: "Fan", status: "OFF", power_usage_w: 50 },
  { id: "d3", name: "Washing Machine", status: "ON", power_usage_w: 500 },
  { id: "d4", name: "Fridge", status: "ON", power_usage_w: 200 },
  { id: "d5", name: "Heater", status: "OFF", power_usage_w: 200 },
  { id: "d6", name: "Light", status: "ON", power_usage_w: 18 },
  { id: "d7", name: "TV", status: "OFF", power_usage_w: 120 },
  { id: "d8", name: "Laptop", status: "ON", power_usage_w: 65 },
  { id: "d9", name: "Water Heater", status: "OFF", power_usage_w: 3000 },
];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildTodayFlow(history, liveData, now) {
  const seedData = history.length > 0 ? history : fallbackHistory;
  const intervalMinutes = 15;
  const totalPoints = 17;
  const points = Array.from({ length: totalPoints }, (_, index) => {
    const pointTime = new Date(now);
    const minutesBack = (totalPoints - 1 - index) * intervalMinutes;
    pointTime.setMinutes(now.getMinutes() - minutesBack, 0, 0);
    const seed = seedData[index % seedData.length] ?? fallbackHistory[index % fallbackHistory.length];
    const progress = index / (totalPoints - 1);
    const liveBlend = index === totalPoints - 1 ? 1 : progress * 0.65;
    const daytimeBoost = pointTime.getHours() >= 7 && pointTime.getHours() <= 17 ? 1 : 0.55;
    const wave = Math.sin((index / 2.1) + pointTime.getHours()) * 0.18;
    const baseGrid = ((Number(seed.grid) || 0) / 5) + wave;
    const baseSolar = (((Number(seed.solar) || 0) / 3) * daytimeBoost) - wave;
    const grid = baseGrid + ((liveData.grid_draw_kw - baseGrid) * liveBlend);
    const solar = baseSolar + ((liveData.solar_generation_kw - baseSolar) * liveBlend);

    return {
      label: index === totalPoints - 1 ? `Now ${formatTime(now)}` : formatTime(pointTime),
      grid: Number(Math.max(0, grid).toFixed(1)),
      solar: Number(Math.max(0, solar).toFixed(1)),
    };
  });

  return points;
}

export default function LiveDashboard() {
  const [data, setData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [devicesData, setDevicesData] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
      const results = await Promise.allSettled([
        fetchLiveDashboard(),
        fetchAnalyticsHistory("daily"),
        fetchDevices(),
        fetchBillingSummary(),
      ]);

      const liveResult = results[0];
      const historyResult = results[1];
      const devicesResult = results[2];
      const billingResult = results[3];

      if (liveResult.status === "fulfilled") {
        setData(liveResult.value);
      }

      if (historyResult.status === "fulfilled") {
        setHistoryData(historyResult.value);
      }

      if (devicesResult.status === "fulfilled") {
        setDevicesData(devicesResult.value);
      }

      if (billingResult.status === "fulfilled") {
        setBillingData(billingResult.value);
      }

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length === results.length) {
        setData(fallbackLiveData);
        setHistoryData(fallbackHistory);
        setDevicesData(fallbackDevices);
        setBillingData(fallbackBilling);
        setWarning("Using local fallback data because the backend is unreachable.");
      } else if (failed.length > 0) {
        setWarning(
          "Some dashboard data could not be loaded and is shown partially."
        );
        console.warn(
          "Partial dashboard load failure:",
          failed.map((result) => result.reason?.message || "Fetch failed").join(" — ")
        );
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--volt-yellow)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-600/40 bg-red-950/50 p-8 text-center text-red-200">
        <h2 className="text-2xl font-semibold mb-3">Dashboard loading issue</h2>
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  const safeData = data ?? {
    grid_draw_kw: 0,
    solar_generation_kw: 0,
    net_usage_kw: 0
  };
  const safeBilling = billingData ?? fallbackBilling;
  const isExporting = safeData.net_usage_kw < 0;
  const gridUsage = Number(safeBilling.current_grid_data_usage) || 0;
  const solarUsage = Number(safeBilling.solar_energy_usage) || 0;
  const projectedBill = Number(safeBilling.projected_bill) || 0;
  const totalUsage = gridUsage + solarUsage;
  const gridUnitRate = gridUsage > 0 ? projectedBill / gridUsage : 0;
  const billSavings = Math.round(solarUsage * gridUnitRate);
  const gridBill = projectedBill;
  const gridShare = totalUsage > 0 ? `${Math.round((gridUsage / totalUsage) * 100)}%` : "0%";
  const solarShare = totalUsage > 0 ? `${Math.round((solarUsage / totalUsage) * 100)}%` : "0%";
  const co2SavedKg = Math.round(solarUsage * 0.82);

  const totalGrid = historyData.reduce((sum, item) => sum + (item.grid || 0), 0);
  const totalSolar = historyData.reduce((sum, item) => sum + (item.solar || 0), 0);
  const todayFlowData = buildTodayFlow(historyData, safeData, now);
  const currentTimeLabel = formatTime(now);
  const pieData = [
    { name: "Grid Usage", value: totalGrid },
    { name: "Solar Usage", value: totalSolar }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Live energy usage status" />
      {warning && (
        <div className="rounded-3xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] p-4 text-sm text-[var(--volt-yellow)]">
          {warning}
        </div>
      )}

      {todayFlowData.length > 0 ? (
        <LineChartPanel
          data={todayFlowData}
          title="Today's Energy Flow"
          subtitle={`Live status up to ${currentTimeLabel}.`}
        />
      ) : (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-10 text-center text-zinc-400">
          No historical energy data available yet.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Grid Power"
          value={safeData.grid_draw_kw}
          unit="kW"
          icon={<Zap size={26} fill="currentColor" />}
          accentClass="bg-purple-500"
          iconBg="bg-purple-50"
          iconText="text-purple-600"
          iconMotion="metric-icon-grid"
          statusLabel={`Grid is ${gridShare} of usage · ₹${gridBill.toLocaleString("en-IN")}`}
          statusTone="bg-purple-100 text-purple-700"
          highlightClass="hover:border-purple-500/70 hover:shadow-[0_0_28px_rgba(139,92,246,0.18)]"
        />
        <MetricCard
          title="Solar Power"
          value={safeData.solar_generation_kw}
          unit="kW"
          icon={<Sun size={26} />}
          accentClass="bg-orange-500"
          iconBg="bg-orange-50"
          iconText="text-orange-500"
          iconMotion="metric-icon-solar"
          statusLabel={`${solarShare} solar share`}
          statusTone="bg-orange-100 text-orange-700"
          highlightClass="hover:border-orange-500/70 hover:shadow-[0_0_28px_rgba(249,115,22,0.18)]"
        />
        <MetricCard
          title="Bill Savings"
          value={`₹${billSavings.toLocaleString("en-IN")}`}
          unit=""
          icon={<Activity size={26} />}
          accentClass="bg-green-500"
          iconBg="bg-green-50 text-green-600"
          iconText=""
          iconMotion="metric-icon-surplus"
          statusLabel={isExporting ? "Extra solar is helping your bill" : `Avoiding ₹${billSavings.toLocaleString("en-IN")} from grid`}
          statusTone="bg-green-100 text-green-700"
          highlightClass="hover:border-green-500/70 hover:shadow-[0_0_28px_rgba(34,197,94,0.18)]"
        />
        <MetricCard
          title="Eco Impact"
          value={co2SavedKg.toLocaleString("en-IN")}
          unit="kg CO2"
          icon={<Leaf size={26} />}
          accentClass="bg-emerald-500"
          iconBg="bg-emerald-50 text-emerald-600"
          iconText=""
          iconMotion="metric-icon-surplus"
          statusLabel="Saved by solar this month"
          statusTone="bg-emerald-100 text-emerald-700"
          highlightClass="hover:border-emerald-500/70 hover:shadow-[0_0_28px_rgba(16,185,129,0.18)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChartPanel data={pieData} />
        <TopConsumersTable devices={devicesData} />
      </div>
    </div>
  );
}
