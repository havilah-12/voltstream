// Used by the Dashboard page for grid, solar, bill savings, and eco metrics.
export default function MetricCard({ title, value, unit, icon, accentClass, iconBg, iconText, iconMotion = "", statusLabel, statusTone, highlightClass = "hover:border-[var(--volt-yellow-border)]" }) {
  return (
    <div className={`bg-zinc-900 rounded-2xl p-5 shadow-sm border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors min-h-[190px] ${highlightClass}`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${accentClass}`}></div>
      <div className={`metric-icon w-12 h-12 ${iconBg} ${iconText} ${iconMotion} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="font-display text-base font-semibold uppercase text-[var(--volt-yellow)]">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit ? <span className="text-base font-medium text-zinc-500">{unit}</span> : null}
      </div>
      {statusLabel ? (
        <div className={`mt-2 flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${statusTone}`}>
          {statusLabel}
        </div>
      ) : null}
    </div>
  );
}
