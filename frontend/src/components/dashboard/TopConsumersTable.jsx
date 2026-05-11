export default function TopConsumersTable({ devices }) {
  const deviceList = Array.isArray(devices) ? devices : [];

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-800 flex flex-col lg:col-span-2">
      <h3 className="text-lg font-semibold text-[var(--volt-yellow)] mb-6">Top Energy Consumers</h3>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="pb-3 px-4 font-medium">Device</th>
              <th className="pb-3 px-4 font-medium">Status</th>
              <th className="pb-3 px-4 font-medium text-right">Power Usage</th>
            </tr>
          </thead>
          <tbody>
            {[...deviceList].sort((a, b) => b.power_usage_w - a.power_usage_w).slice(0, 4).map((device) => (
              <tr key={device.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-4 px-4 text-white font-medium">{device.name}</td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${device.status === 'ON' ? 'bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] border border-[var(--volt-yellow-border)]' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                    {device.status === "ON" ? "ON" : "TURNED OFF"}
                  </span>
                </td>
                <td className="py-4 px-4 text-white text-right font-bold">{device.power_usage_w} W</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
