import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { THEME_COLORS } from "../constants/theme";
import ChartCard from "./ChartCard";

const sourceColors = {
  "Grid Usage": THEME_COLORS.gridGradientStart,
  "Solar Usage": THEME_COLORS.solarGradientStart,
};

const sourceGradients = {
  "Grid Usage": `linear-gradient(135deg, ${THEME_COLORS.gridGradientStart}, ${THEME_COLORS.gridGradientEnd})`,
  "Solar Usage": `linear-gradient(135deg, ${THEME_COLORS.solarGradientStart}, ${THEME_COLORS.solarGradientEnd})`,
};

function SourceLegend({ payload }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 pt-4">
      {payload?.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-sm font-semibold" style={{ color: sourceColors[entry.value] }}>
          <span className="h-3 w-3 rounded-full shadow-sm" style={{ background: sourceGradients[entry.value] }} />
          <span>{entry.value} (kWh)</span>
        </div>
      ))}
    </div>
  );
}

function SourceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 shadow-xl">
      {payload.map((entry) => {
        const color = sourceColors[entry.name] ?? entry.color;
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

export default function PieChartPanel({ data }) {
  const chartData = Array.isArray(data) ? data : [];
  const hasData = chartData.some((entry) => entry.value > 0);

  return (
    <ChartCard title="Usage by Source (kWh)" className="min-h-[360px]">
      <div className="flex-1 min-h-[260px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            <defs>
              <radialGradient id="gridPieGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={THEME_COLORS.gridGradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={THEME_COLORS.grid} stopOpacity={0.72} />
              </radialGradient>
              <radialGradient id="solarPieGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={THEME_COLORS.solarGradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={THEME_COLORS.solar} stopOpacity={0.72} />
              </radialGradient>
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              animationDuration={1200}
              animationEasing="ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "url(#gridPieGradient)" : "url(#solarPieGradient)"}
                />
              ))}
            </Pie>
            <Tooltip
              content={<SourceTooltip />}
            />
            <Legend verticalAlign="bottom" content={<SourceLegend />} />
          </PieChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-400">
            No usage breakdown data available yet.
          </div>
        )}
      </div>
    </ChartCard>
  );
}
