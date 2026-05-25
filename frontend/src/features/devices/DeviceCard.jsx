import { ChevronDown, Pencil, Power, Trash2 } from "lucide-react";
import ThemedTooltip from "../../components/ThemedTooltip";
import { getTypeConfig, getDeviceLabel } from "./deviceUtils";

export default function DeviceCard({
  device,
  isSelected,
  openUnitMenu,
  pendingDeleteId,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onMenuToggle,
  onCancelDelete,
}) {
  const config = getTypeConfig(device.type);
  const Icon = config.icon;
  const isRunning = device.status === "ON";
  const isMenuOpen = openUnitMenu === device.type;
  const isPendingDelete = pendingDeleteId === device.id;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] ${
        isSelected
          ? `${config.tone} border-2 shadow-lg`
          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:shadow-xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${config.tone} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{device.name}</h4>
            {device.location && <p className="text-sm text-zinc-400">{device.location}</p>}
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative" data-unit-menu>
          <button
            onClick={() => onMenuToggle(device.type)}
            className="w-8 h-8 rounded-lg hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-10 overflow-hidden">
              <button
                onClick={() => onEdit(device)}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Device
              </button>
              <button
                onClick={() => onDelete(device.id)}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Device
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400" : "bg-zinc-600"}`} />
        <span className={`text-sm font-medium ${isRunning ? "text-emerald-400" : "text-zinc-500"}`}>
          {isRunning ? "Running" : "Off"}
        </span>
        <span className="text-sm text-zinc-500">• {device.power_usage_w}W</span>
      </div>

      {/* Toggle Button */}
      <ThemedTooltip content={`Turn ${isRunning ? "off" : "on"} ${device.name}`}>
        <button
          onClick={() => onToggle(device.id, device.status)}
          className={`w-full py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            isRunning
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600"
          }`}
        >
          <Power className="w-4 h-4" />
          {isRunning ? "Turn Off" : "Turn On"}
        </button>
      </ThemedTooltip>

      {/* Delete Confirmation */}
      {isPendingDelete && (
        <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-white font-medium text-center">Delete {device.name}?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(device.id, true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              Delete
            </button>
            <button
              onClick={onCancelDelete}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
