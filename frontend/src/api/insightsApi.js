import { askChatBot } from "./chatApi";

function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
}

function buildDeviceSnapshot(devices) {
  const getDeviceLabel = (device) =>
    device.location ? `${device.name} - ${device.location}` : device.name;

  const activeDevices = devices.filter((device) => device.status === "ON");
  const topDevices = [...devices]
    .sort((left, right) => Number(right.power_usage_w ?? 0) - Number(left.power_usage_w ?? 0))
    .slice(0, 4)
    .map((device) => ({
      name: getDeviceLabel(device),
      type: device.type,
      status: device.status,
      powerUsageW: Number(device.power_usage_w ?? 0),
    }));

  return {
    totalDevices: devices.length,
    activeDevices: activeDevices.length,
    activeLoadW: activeDevices.reduce((sum, device) => sum + Number(device.power_usage_w ?? 0), 0),
    topDevices,
  };
}

function buildPrompt({ period, analytics, billing, devices, dashboard }) {
  const deviceSnapshot = buildDeviceSnapshot(devices);
  const dataSummary = {
    period,
    analytics,
    billing,
    dashboard,
    devices: deviceSnapshot,
  };

  return `
You are a helpful home energy assistant helping a VoltStream user understand their ${period} energy data.

Use the data below to explain:
1. what really happened in this ${period} period
2. what it means for bill savings
3. what device actions the user should take next
4. one short future suggestion

Rules:
- Be specific and practical.
- Keep each field short, warm, and easy to understand.
- Use simple everyday words.
- Avoid sounding technical, analytical, or robotic.
- Mention real patterns from the data when possible.
- Focus on savings, solar usage, grid use, and device management.
- Do not mention JSON, APIs, databases, or technical internals.
- Do not use jargon like offset, dependence, consumption profile, or optimization.
- Prefer phrases like "you used more grid power", "solar helped more", "your bill may go up", or "try running this later in the day".
- Return valid JSON only in this exact shape:
{
  "whatHappened": "string",
  "billSavings": "string",
  "deviceSuggestions": ["string", "string"],
  "futureOutlook": "string"
}

Data:
${JSON.stringify(dataSummary, null, 2)}
  `.trim();
}

function buildLocalInsights({ period, analytics, billing, devices }) {
  const getDeviceLabel = (device) =>
    device.location ? `${device.name} - ${device.location}` : device.name;
  const totalGrid = analytics.reduce((sum, item) => sum + Number(item.grid ?? 0), 0);
  const totalSolar = analytics.reduce((sum, item) => sum + Number(item.solar ?? 0), 0);
  const activeDevices = devices.filter((device) => device.status === "ON");
  const topActiveDevice = [...activeDevices].sort(
    (left, right) => Number(right.power_usage_w ?? 0) - Number(left.power_usage_w ?? 0)
  )[0];
  const projectedBill = Number(billing.projected_bill ?? 0);
  const solarUsage = Number(billing.solar_energy_usage ?? 0);
  const gridUsage = Number(billing.current_grid_data_usage ?? 0);
  const solarShare = totalGrid > 0 ? Math.round((totalSolar / totalGrid) * 100) : 0;

  return {
    whatHappened:
      totalSolar >= totalGrid
        ? `In this ${period} view, solar helped strongly and covered a big part of your home usage. Because of that, grid power stayed lower through most of the period.`
        : `In this ${period} view, your home still used a fair amount of grid power. Solar helped, but it was not enough to cover everything across the full period.`,
    billSavings:
      solarUsage > 0
        ? `Your solar usage is helping keep the bill lower because you are buying less electricity from the grid. Right now the projected bill is around Rs. ${projectedBill}, and using more solar-first hours should help further.`
        : `There is not much solar support showing in the current bill picture, so savings mostly depend on cutting back heavy grid usage. Right now the projected bill is around Rs. ${projectedBill}.`,
    deviceSuggestions: [
      topActiveDevice
        ? `${getDeviceLabel(topActiveDevice)} is one of the heavier devices running right now at ${topActiveDevice.power_usage_w} W, so that is a good place to start if you want to cut usage.`
        : "There are no heavy devices running right now, so you are already in a fairly light usage window.",
      solarShare >= 50
        ? "Try to run heavier devices when solar is strongest so more of that usage is covered without taking extra power from the grid."
        : "Try shifting AC, heater, washing, or kitchen usage into calmer hours where possible so the grid load stays lower.",
    ],
    futureOutlook:
      gridUsage > solarUsage
        ? `If you reduce a few heavy-device hours in the next ${period} cycle, your bill should start looking better and your solar savings can go further.`
        : `If you keep lining up appliance use with solar availability, the next ${period} cycle should stay favorable for savings.`,
  };
}

export async function generateUsageInsights({ period, analytics, billing, devices, dashboard, signal }) {
  const response = await askChatBot(buildPrompt({ period, analytics, billing, devices, dashboard }), [], signal);
  const parsed = parseJsonSafely(response?.answer ?? "");

  if (
    parsed &&
    typeof parsed.whatHappened === "string" &&
    typeof parsed.billSavings === "string" &&
    Array.isArray(parsed.deviceSuggestions) &&
    typeof parsed.futureOutlook === "string"
  ) {
    return parsed;
  }

  return buildLocalInsights({ period, analytics, billing, devices });
}
