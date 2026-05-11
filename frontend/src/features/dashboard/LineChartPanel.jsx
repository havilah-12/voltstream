// Used by the Dashboard page to chart today's live grid and solar flow.
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from "recharts";
import { CHART_ANIMATION, THEME_COLORS } from "../../constants/theme";
import ChartCard from "../../components/ChartCard";

const energyColors = {
  "Grid (kW)": THEME_COLORS.gridGradientStart,
  "Solar (kW)": THEME_COLORS.solarGradientStart,
};

const energyGradients = {
  "Grid (kW)": `linear-gradient(135deg, ${THEME_COLORS.gridGradientStart}, ${THEME_COLORS.gridGradientEnd})`,
  "Solar (kW)": `linear-gradient(135deg, ${THEME_COLORS.solarGradientStart}, ${THEME_COLORS.solarGradientEnd})`,
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
            <span>{entry.name}: {entry.value} kW</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LineChartPanel({ data, title = "Today's Energy Flow", subtitle }) {
  const chartData = Array.isArray(data) ? data : [];
  const hasData = chartData.length > 0;
  const hourlyTicks = chartData
    .filter((_, index) => index % 4 === 0 || index === chartData.length - 1)
    .map((item) => item.label);

  return (
    <ChartCard title={title}>
      {subtitle ? <p className="-mt-2 mb-4 text-sm font-semibold text-zinc-400">{subtitle}</p> : null}
      <div className="relative w-full h-[300px]">
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 18 }}>
                <defs>
                  <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME_COLORS.gridGradientStart} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={THEME_COLORS.gridGradientEnd} stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME_COLORS.solarGradientStart} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={THEME_COLORS.solarGradientEnd} stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="label" ticks={hourlyTicks} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(value) => `${value} kW`}
                  width={54}
                  dx={-6}
                />
                <Tooltip content={<EnergyTooltip />} />
                <Legend content={<EnergyLegend />} />
                <Area
                  type="monotone"
                  dataKey="grid"
                  name="Grid (kW)"
                  stroke={THEME_COLORS.grid}
                  strokeWidth={4}
                  strokeDasharray="10 7"
                  strokeLinecap="round"
                  fill="url(#gridGradient)"
                  fillOpacity={0.42}
                  className="energy-wave energy-wave-grid"
                  activeDot={{ r: 6 }}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
                <Area
                  type="monotone"
                  dataKey="solar"
                  name="Solar (kW)"
                  stroke={THEME_COLORS.solar}
                  strokeWidth={4}
                  strokeDasharray="14 8"
                  strokeLinecap="round"
                  fill="url(#solarGradient)"
                  fillOpacity={0.38}
                  className="energy-wave energy-wave-solar"
                  activeDot={{ r: 6 }}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            No trend data available.
          </div>
        )}
      </div>
    </ChartCard>
  );
}
