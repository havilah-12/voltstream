// Used by chart feature panels on Dashboard and Usage History pages.
export default function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`relative flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950/80 rounded-3xl p-6 shadow-xl border border-zinc-800/60 backdrop-blur-sm overflow-hidden ${className}`}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.08),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(255,122,24,0.08),_transparent_30%)]"></div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <h3 className="text-lg font-semibold text-[var(--volt-yellow)] mb-6">{title}</h3>
        {children}
      </div>
    </div>
  );
}
