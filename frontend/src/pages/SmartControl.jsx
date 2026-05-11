import { useEffect, useState } from "react";
import { createDevice, deleteDevice, fetchDevices, updateDevice, updateDeviceStatus } from "../api/devicesApi";
import VoltSelect from "../components/VoltSelect";
import {
  AirVent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Laptop,
  Leaf,
  Lightbulb,
  Microwave,
  Pencil,
  Plug,
  Plus,
  Power,
  Refrigerator,
  Snowflake,
  Tv,
  WashingMachine,
  Wind,
  Trash2,
} from "lucide-react";

const getDeviceType = (device) => device.type ?? device.name;
const getDeviceLabel = (device) => `${device.name}${device.location ? ` - ${device.location}` : ""}`;
const emptyForm = { type: "AC", name: "AC 1", location: "Bedroom 1", status: "OFF", power_usage_w: 1500 };
const statusOptions = [
  { value: "ON", label: "Currently Running" },
  { value: "OFF", label: "Turned Off" },
];

const householdDefaults = [
  { id: "cooler-1", type: "Cooler", name: "Cooler 1", location: "Living Room", status: "OFF", power_usage_w: 220 },
  { id: "water-heater-1", type: "Water Heater", name: "Water Heater 1", location: "Bathroom", status: "OFF", power_usage_w: 3000 },
  { id: "light-1", type: "Light", name: "Living Room Light", location: "Living Room", status: "ON", power_usage_w: 18 },
  { id: "light-2", type: "Light", name: "Bedroom Light", location: "Bedroom 1", status: "OFF", power_usage_w: 18 },
  { id: "bulb-1", type: "Bulb", name: "Kitchen Bulb", location: "Kitchen", status: "ON", power_usage_w: 12 },
  { id: "tv-1", type: "TV", name: "TV 1", location: "Living Room", status: "OFF", power_usage_w: 120 },
  { id: "laptop-1", type: "Laptop", name: "Laptop Charger", location: "Study", status: "ON", power_usage_w: 65 },
  { id: "microwave-1", type: "Microwave", name: "Microwave 1", location: "Kitchen", status: "OFF", power_usage_w: 1000 },
  { id: "cooker-1", type: "Cooker", name: "Electric Cooker", location: "Kitchen", status: "OFF", power_usage_w: 700 },
];

const deviceTypeConfig = {
  ac: { icon: Snowflake, tone: "text-sky-300 bg-sky-500/10 border-sky-500/20", watts: 1500 },
  fan: { icon: Wind, tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20", watts: 50 },
  cooler: { icon: AirVent, tone: "text-teal-300 bg-teal-500/10 border-teal-500/20", watts: 220 },
  heater: { icon: Flame, tone: "text-orange-300 bg-orange-500/10 border-orange-500/20", watts: 2000 },
  "water heater": { icon: Flame, tone: "text-red-300 bg-red-500/10 border-red-500/20", watts: 3000 },
  fridge: { icon: Refrigerator, tone: "text-lime-300 bg-lime-500/10 border-lime-500/20", watts: 200 },
  "washing machine": { icon: WashingMachine, tone: "text-violet-300 bg-violet-500/10 border-violet-500/20", watts: 500 },
  light: { icon: Lightbulb, tone: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20", watts: 18 },
  bulb: { icon: Lightbulb, tone: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20", watts: 12 },
  tv: { icon: Tv, tone: "text-blue-300 bg-blue-500/10 border-blue-500/20", watts: 120 },
  laptop: { icon: Laptop, tone: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20", watts: 65 },
  charger: { icon: Plug, tone: "text-zinc-300 bg-zinc-500/10 border-zinc-500/20", watts: 35 },
  microwave: { icon: Microwave, tone: "text-rose-300 bg-rose-500/10 border-rose-500/20", watts: 1000 },
  cooker: { icon: Plug, tone: "text-red-300 bg-red-500/10 border-red-500/20", watts: 700 },
};

const seasonalModes = {
  manual: {
    label: "Manual Control",
    helper: "No automatic seasonal changes applied.",
    icon: Power,
  },
  summer: {
    label: "Summer Cooling",
    helper: "AC, fans and coolers ON; heaters OFF.",
    icon: Snowflake,
    on: ["ac", "fan", "cooler"],
    off: ["heater"],
  },
  winter: {
    label: "Winter Warm",
    helper: "Room heaters ON; AC, fans and coolers OFF.",
    icon: Flame,
    on: ["heater"],
    off: ["ac", "fan", "cooler"],
  },
  saving: {
    label: "Energy Saving",
    helper: "Keeps 2 fans and key essentials ON; heavy appliances OFF.",
    icon: Leaf,
  },
};

const normalizeType = (type) => type.toLowerCase();
const getPreferredSelections = (devices) =>
  devices.reduce((selected, device) => {
    const type = getDeviceType(device);
    const existing = selected[type];
    if (!existing || (device.status === "ON" && existing.status !== "ON")) {
      selected[type] = device;
    }
    return selected;
  }, {});

const withHouseholdDefaults = (devices) => {
  const existingIds = new Set(devices.map((device) => device.id));
  const existingTypes = new Set(devices.map((device) => normalizeType(getDeviceType(device))));
  const missingDefaults = householdDefaults.filter((device) => {
    const type = normalizeType(getDeviceType(device));
    return !existingIds.has(device.id) && !existingTypes.has(type);
  });

  return [...devices, ...missingDefaults];
};

const getTypeConfig = (type) => deviceTypeConfig[normalizeType(type)] ?? {
  icon: Power,
  tone: "text-zinc-300 bg-zinc-800 border-zinc-700",
  watts: 200,
};

function getSavingStatus(device, typeIndex) {
  const type = normalizeType(getDeviceType(device));
  const count = typeIndex[type] ?? 0;

  if (type === "fan") return count <= 2 ? "ON" : "OFF";
  if (type === "light" || type === "bulb") return count <= 2 ? "ON" : "OFF";
  if (["fridge", "laptop", "charger"].includes(type)) return "ON";
  if (["ac", "cooler", "heater", "water heater", "washing machine", "microwave", "cooker", "tv"].includes(type)) return "OFF";
  return Number(device.power_usage_w) <= 75 ? "ON" : "OFF";
}

const deviceSections = [
  {
    title: "Daily Essentials",
    helper: "Everyday household devices",
    types: ["fan", "light", "bulb", "fridge"],
  },
  {
    title: "Climate Control",
    helper: "Cooling and heating appliances",
    types: ["ac", "cooler", "heater", "water heater"],
  },
  {
    title: "Home Appliances",
    helper: "Kitchen and laundry loads",
    types: ["washing machine", "microwave", "cooker"],
  },
  {
    title: "Electronics",
    helper: "TV, laptop and charging devices",
    types: ["tv", "laptop", "charger"],
  },
];

export default function SmartControl() {
  const [devices, setDevices] = useState([]);
  const [selectedByType, setSelectedByType] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [seasonalMode, setSeasonalMode] = useState("manual");
  const [activeCategory, setActiveCategory] = useState("Daily Essentials");
  const [openUnitMenu, setOpenUnitMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices()
      .then((result) => {
        const nextDevices = withHouseholdDefaults(result ?? []);
        setDevices(nextDevices);
        const preferredSelections = getPreferredSelections(nextDevices);
        setSelectedByType(
          Object.fromEntries(
            Object.entries(preferredSelections).map(([type, device]) => [type, device.id])
          )
        );
      })
      .catch((err) => setError(err.message || "Unable to load devices."))
      .finally(() => setLoading(false));
  }, []);

  const toggleDevice = async (id, currentStatus) => {
    const newStatus = currentStatus === "ON" ? "OFF" : "ON";
    
    // Optimistic update
    setDevices(prev => {
      const nextDevices = prev.map(d => d.id === id ? { ...d, status: newStatus } : d);
      const toggledDevice = nextDevices.find((device) => device.id === id);
      if (toggledDevice) {
        const type = getDeviceType(toggledDevice);
        const runningDevice = nextDevices.find(
          (device) => getDeviceType(device) === type && device.status === "ON"
        );
        setSelectedByType((selected) => ({
          ...selected,
          [type]: runningDevice?.id ?? toggledDevice.id,
        }));
      }
      return nextDevices;
    });
    
    try {
      await updateDeviceStatus(id, newStatus);
    } catch (error) {
      console.error(error);
      // Revert on error
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus } : d));
    }
  };

  const beginAdd = (type = "AC") => {
    const count = devices.filter((device) => getDeviceType(device) === type).length + 1;
    setEditingId("new");
    setForm({
      type,
      name: `${type} ${count}`,
      location: "",
      status: "OFF",
      power_usage_w: getTypeConfig(type).watts,
    });
  };

  const applySeasonalMode = async (modeKey) => {
    setSeasonalMode(modeKey);
    const mode = seasonalModes[modeKey];
    if (!mode || modeKey === "manual") return;

    const typeIndex = {};
    const nextDevices = devices.map((device) => {
      const normalizedType = normalizeType(getDeviceType(device));
      typeIndex[normalizedType] = (typeIndex[normalizedType] ?? 0) + 1;
      if (modeKey === "saving") return { ...device, status: getSavingStatus(device, typeIndex) };
      if (mode.on?.includes(normalizedType)) return { ...device, status: "ON" };
      if (mode.off?.includes(normalizedType)) return { ...device, status: "OFF" };
      return device;
    });

    setDevices(nextDevices);

    const changedDevices = nextDevices.filter((device) => {
      const current = devices.find((item) => item.id === device.id);
      return current && current.status !== device.status;
    });

    const results = await Promise.allSettled(
      changedDevices.map((device) => updateDeviceStatus(device.id, device.status))
    );
    if (results.some((result) => result.status === "rejected")) {
      console.warn("Some seasonal mode device updates failed.");
    }
  };

  const beginEdit = (device) => {
    setEditingId(device.id);
    setForm({
      type: getDeviceType(device),
      name: device.name,
      location: device.location ?? "",
      status: device.status,
      power_usage_w: device.power_usage_w,
    });
  };

  const saveDevice = async (event) => {
    event.preventDefault();
    const payload = { ...form, power_usage_w: Number(form.power_usage_w) || 0 };

    if (editingId === "new") {
      const created = await createDevice(payload);
      setDevices((prev) => [...prev, created]);
      setSelectedByType((prev) => ({ ...prev, [getDeviceType(created)]: created.id }));
    } else {
      const updated = await updateDevice(editingId, payload);
      setDevices((prev) => prev.map((device) => (device.id === editingId ? updated : device)));
      setSelectedByType((prev) => ({ ...prev, [getDeviceType(updated)]: updated.id }));
    }

    setEditingId(null);
  };

  const removeDevice = async (device) => {
    await deleteDevice(device.id);
    setDevices((prev) => prev.filter((item) => item.id !== device.id));
    setSelectedByType((prev) => {
      const next = { ...prev };
      if (next[getDeviceType(device)] === device.id) delete next[getDeviceType(device)];
      return next;
    });
    if (editingId === device.id) setEditingId(null);
  };

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
        <h2 className="text-2xl font-semibold mb-3">Device data unavailable</h2>
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  const activeCount = devices.filter(d => d.status === "ON").length;
  const totalPower = devices.filter(d => d.status === "ON").reduce((sum, d) => sum + d.power_usage_w, 0);
  const groupedDevices = devices.reduce((groups, device) => {
    const type = getDeviceType(device);
    if (!groups[type]) groups[type] = [];
    groups[type].push(device);
    return groups;
  }, {});
  const deviceGroups = Object.entries(groupedDevices);
  const usedSectionTypes = new Set(deviceSections.flatMap((section) => section.types));
  const sectionedDeviceGroups = [
    ...deviceSections.map((section) => ({
      ...section,
      groups: deviceGroups.filter(([type]) => section.types.includes(normalizeType(type))),
    })),
    {
      title: "Other Devices",
      helper: "Custom devices added by you",
      groups: deviceGroups.filter(([type]) => !usedSectionTypes.has(normalizeType(type))),
    },
  ].filter((section) => section.groups.length > 0);
  const selectedSection = sectionedDeviceGroups.find((section) => section.title === activeCategory) ?? sectionedDeviceGroups[0];
  const cardsPerPage = 6;
  const selectedGroups = selectedSection?.groups ?? [];
  const totalPages = Math.max(1, Math.ceil(selectedGroups.length / cardsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleGroups = selectedGroups.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const seasonalOptions = Object.entries(seasonalModes).map(([key, mode]) => ({
    value: key,
    label: mode.label,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Smart Control</h1>
            <p className="text-zinc-400 mt-1">Manage your home appliances remotely</p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-20 min-w-[150px] flex-col justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 shadow-sm">
              <p className="text-xs text-zinc-500 font-medium uppercase">Active Devices</p>
              <p className="text-lg font-bold text-white">{activeCount} / {devices.length}</p>
            </div>
            <div className="flex h-20 min-w-[150px] flex-col justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 shadow-sm">
              <p className="text-xs text-zinc-500 font-medium uppercase">Current Load</p>
              <p className="text-lg font-bold text-[var(--volt-yellow)]">{totalPower} W</p>
            </div>
          </div>
        </div>
        
      </div>

      {editingId && (
        <form onSubmit={saveDevice} className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-6">
          <input
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Device type"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Room / location"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <input
            type="number"
            value={form.power_usage_w}
            onChange={(event) => setForm((prev) => ({ ...prev, power_usage_w: event.target.value }))}
            placeholder="Watts"
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[var(--volt-yellow)]"
          />
          <VoltSelect
            value={form.status}
            onChange={(status) => setForm((prev) => ({ ...prev, status }))}
            options={statusOptions}
            ariaLabel="Device status"
            className="md:col-span-1"
            buttonClassName="h-full min-h-[48px] border-zinc-700 px-4 py-3"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-[var(--volt-yellow)] px-4 py-3 font-bold text-black">
              Save
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-700 px-4 py-3 font-bold text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {sectionedDeviceGroups.map((section) => (
              <button
                key={section.title}
                type="button"
                onClick={() => {
                  setActiveCategory(section.title);
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  selectedSection?.title === section.title
                    ? "bg-[var(--volt-yellow)] text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <VoltSelect
              value={seasonalMode}
              onChange={applySeasonalMode}
              options={seasonalOptions}
              ariaLabel="Seasonal mode"
              title={seasonalModes[seasonalMode].helper}
              className="min-w-[220px]"
            />
            <button
              type="button"
              onClick={() => beginAdd()}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] px-4 text-sm font-bold text-[var(--volt-yellow)] transition-colors hover:bg-[rgba(234,179,8,0.22)]"
            >
              <Plus size={18} /> Add Device
            </button>
          </div>
        </div>

        {selectedSection ? (
          <section className="rounded-2xl border border-zinc-900">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--volt-yellow)]">{selectedSection.title}</h2>
                <p className="text-sm text-zinc-500">{selectedSection.helper}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase text-zinc-600">
                  {selectedGroups.reduce((sum, [, group]) => sum + group.filter((item) => item.status === "ON").length, 0)} running
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 hover:text-white"
                    title="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="min-w-[58px] text-center text-xs font-bold text-zinc-500">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 hover:text-white"
                    title="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleGroups.map(([type, group]) => {
                const selectedId = selectedByType[type] ?? group[0]?.id;
                const device = group.find((item) => item.id === selectedId) ?? group[0];
                const isOn = device.status === "ON";
                const runningCount = group.filter((item) => item.status === "ON").length;
                const hasRunningUnit = runningCount > 0;
                const config = getTypeConfig(type);
                const DeviceIcon = config.icon;

                return (
                  <div 
                    key={type} 
                    className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 ${
                      hasRunningUnit 
                        ? 'bg-zinc-900 text-white border-[var(--volt-yellow-border)] shadow-[0_0_22px_var(--volt-yellow-glow)]' 
                        : 'bg-zinc-900 text-white border-zinc-800 shadow-sm hover:border-[var(--volt-yellow-border)]'
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.tone}`}>
                          <DeviceIcon size={22} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-white">{type}</h3>
                          <p className="text-xs font-semibold text-zinc-500">{runningCount} / {group.length} running</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleDevice(device.id, device.status)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                          isOn 
                            ? 'bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] ring-1 ring-[var(--volt-yellow-border)] hover:bg-[rgba(234,179,8,0.22)]' 
                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                        }`}
                        title="Toggle selected unit"
                      >
                        <Power size={21} className={isOn ? 'stroke-[2.5px]' : ''} />
                      </button>
                    </div>

                    {group.length > 1 ? (
                      <div className="relative mb-3">
                        <button
                          type="button"
                          onClick={() => setOpenUnitMenu((current) => (current === type ? null : type))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold outline-none transition-colors ${
                            hasRunningUnit
                              ? 'border-[var(--volt-yellow-border)] bg-black/35 text-white hover:border-[var(--volt-yellow)]'
                              : 'border-zinc-700 bg-zinc-950 text-white hover:border-[var(--volt-yellow-border)]'
                          }`}
                        >
                          <span className="truncate">{getDeviceLabel(device)}</span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 ${hasRunningUnit ? 'text-[var(--volt-yellow)]' : 'text-zinc-500'}`}
                          />
                        </button>
                        {openUnitMenu === type && (
                          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[var(--volt-yellow-border)] bg-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                            {group.map((item) => {
                              const selected = item.id === device.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedByType((prev) => ({ ...prev, [type]: item.id }));
                                    setOpenUnitMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold transition-colors ${
                                    selected
                                      ? "bg-[var(--volt-yellow)] text-black"
                                      : "text-white hover:bg-[var(--volt-yellow-soft)] hover:text-[var(--volt-yellow)]"
                                  }`}
                                >
                                  <span className="truncate">{getDeviceLabel(item)}</span>
                                  <span className={selected ? "text-xs text-black/70" : "text-xs text-zinc-500"}>
                                    {item.status === "ON" ? "On" : "Off"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mb-3 truncate rounded-xl border border-zinc-800 bg-black/20 px-3 py-2.5 text-sm font-semibold text-white">
                        {getDeviceLabel(device)}
                      </p>
                    )}

                    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                      <span className={hasRunningUnit ? 'text-zinc-300' : 'text-zinc-500'}>{device.location ?? "Whole house"}</span>
                      <span className="font-bold text-white">{device.power_usage_w} W</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                        hasRunningUnit ? 'bg-green-500/10 text-green-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${hasRunningUnit ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                        {hasRunningUnit ? `${runningCount} On` : 'Off'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => beginEdit(device)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
                          title="Edit selected unit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => removeDevice(device)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                          title="Remove selected unit"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {hasRunningUnit && (
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(234,179,8,0.10),rgba(234,179,8,0.03)_45%,transparent_70%)]"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
