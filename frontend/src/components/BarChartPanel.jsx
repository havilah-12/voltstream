import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_ANIMATION, THEME_COLORS } from "../constants/theme";
import ChartCard from "./ChartCard";

const energyColors = {
  "Grid Usage (kWh)": THEME_COLORS.gridGradientStart,
  "Solar Generation (kWh)": THEME_COLORS.solarGradientStart,
};

const energyGradients = {
  "Grid Usage (kWh)": `linear-gradient(135deg, ${THEME_COLORS.gridGradientStart}, ${THEME_COLORS.gridGradientEnd})`,
  "Solar Generation (kWh)": `linear-gradient(135deg, ${THEME_COLORS.solarGradientStart}, ${THEME_COLORS.solarGradientEnd})`,
};

function EnergyLegend({ payload }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 pt-5">
      {payload?.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-sm font-semibold" style={{ color: energyColors[entry.value] }}>
          <span className="h-3 w-3 rounded-full shadow-sm" style={{ background: energyGradients[entry.value] }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function EnergyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold uppercase text-zinc-400">{label}</p>
      {payload.map((entry) => {
        const color = energyColors[entry.name] ?? entry.color;
        return (
          <div key={entry.name} className="flex items-center gap-2 text-sm font-semibold" style={{ color }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{entry.name}: {entry.value} kWh</span>
          </div>
        );
      })}
    </div>
  );
}

export default function BarChartPanel({ data, className = "" }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard title="Energy Consumption vs Generation" className={className}>
      <div className="flex-1 min-h-[320px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="gridBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME_COLORS.gridGradientStart} stopOpacity={0.85} />
                <stop offset="95%" stopColor={THEME_COLORS.gridGradientEnd} stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="solarBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME_COLORS.solarGradientStart} stopOpacity={0.85} />
                <stop offset="95%" stopColor={THEME_COLORS.solarGradientEnd} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} dx={-10} />
            <Tooltip cursor={{ fill: '#27272a' }} content={<EnergyTooltip />} />
            <Legend content={<EnergyLegend />} />
            <Bar dataKey="grid" name="Grid Usage (kWh)" fill="url(#gridBarGradient)" radius={[6, 6, 0, 0]} barSize={32} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
            <Bar dataKey="solar" name="Solar Generation (kWh)" fill="url(#solarBarGradient)" radius={[6, 6, 0, 0]} barSize={32} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            No history data available to render the chart.
          </div>
        )}
      </div>
    </ChartCard>
  );
}
