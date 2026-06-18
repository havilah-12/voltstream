import { Power } from "lucide-react";
import { deviceTypeConfig, householdDefaults, DEVICE_TYPE_ALIASES } from "./deviceConstants";

export function normalizeTypeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export const canonicalizeDeviceType = (type) => {
  if (!type) return type;
  const normalized = normalizeTypeKey(type);
  for (const [aliases, canonical] of DEVICE_TYPE_ALIASES.entries()) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }
  return type
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const canonicalizeDeviceName = (device) => {
  if (!device?.name) return device?.name;
  return device.name.replace(/\bLight\b/g, "Tube Light");
};

export const getDeviceType = (device) => canonicalizeDeviceType(device.type ?? device.name);

export const getDeviceLabel = (device) =>
  `${canonicalizeDeviceName(device)}${device.location ? ` - ${device.location}` : ""}`;

export const normalizeType = (type) => canonicalizeDeviceType(type).toLowerCase();

export const getPreferredSelections = (devices) =>
  devices.reduce((selected, device) => {
    const type = getDeviceType(device);
    const existing = selected[type];
    if (!existing || (device.status === "ON" && existing.status !== "ON")) {
      selected[type] = device;
    }
    return selected;
  }, {});

export const withHouseholdDefaults = (devices) => {
  const existingIds = new Set(devices.map((device) => device.id));
  const existingTypes = new Set(devices.map((device) => normalizeType(getDeviceType(device))));
  const missingDefaults = householdDefaults.filter((device) => {
    const type = normalizeType(getDeviceType(device));
    return !existingIds.has(device.id) && !existingTypes.has(type);
  });

  return [...devices, ...missingDefaults];
};

export const getTypeConfig = (type) => deviceTypeConfig[normalizeType(type)] ?? {
  icon: Power,
  tone: "text-zinc-300 bg-zinc-800 border-zinc-700",
  watts: 200,
};

export function getSavingStatus(device, typeIndex) {
  const type = normalizeType(getDeviceType(device));
  const count = typeIndex[type] ?? 0;

  if (type === "fan") return count <= 2 ? "ON" : "OFF";
  if (type === "tube light" || type === "bulb") return count <= 2 ? "ON" : "OFF";
  if (["fridge", "laptop", "charger"].includes(type)) return "ON";
  if (["ac", "cooler", "heater", "water heater", "washing machine", "microwave", "cooker", "tv"].includes(type)) return "OFF";
  return Number(device.power_usage_w) <= 75 ? "ON" : "OFF";
}

export function getMentionedDeviceType(message) {
  const normalized = normalizeTypeKey(message);
  for (const [aliases, canonical] of DEVICE_TYPE_ALIASES.entries()) {
    if (aliases.some((alias) => new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`).test(normalized))) {
      return canonical;
    }
  }
  return null;
}

export function messageSpecifiesDevice(message, devicesForType) {
  const normalized = normalizeTypeKey(message);
  return devicesForType.some((device) => {
    const typeOnly = normalizeTypeKey(getDeviceType(device));
    const specificValues = [
      device.id,
      device.name,
      `${device.name} ${device.location ?? ""}`,
      `${getDeviceType(device)} ${device.location ?? ""}`,
      `${device.location ?? ""} ${device.name}`,
      `${device.location ?? ""} ${getDeviceType(device)}`,
    ];
    return specificValues.some((value) => {
      const normalizedValue = normalizeTypeKey(value);
      return normalizedValue && normalizedValue !== typeOnly && normalized.includes(normalizedValue);
    });
  });
}

