// Used by the Smart Control page to display overall system status.
export default function SystemStatusPill({ status = "online" }) {
  const isOnline = status === "online";
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${isOnline ? "bg-green-900/30 text-green-400 border-green-500/20" : "bg-red-900/30 text-red-400 border-red-500/20"}`}>
      <span className="relative flex h-3 w-3">
        {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? "bg-green-500" : "bg-red-500"}`}></span>
      </span>
      {isOnline ? "System Online" : "System Offline"}
    </div>
  );
}
