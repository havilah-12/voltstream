import { getDeviceType, normalizeTypeKey } from "./deviceUtils";

export function getAgentResult(events, fallbackAction = "", fallbackDeviceName = "device", fallbackDeviceType = "") {
  const toolCall = events.find((item) => item.event === "tool_call");
  const toolResponse = events.find((item) => item.event === "tool_response");
  const answer = events.find((item) => item.event === "answer");
  const updatedDevice = toolResponse?.data?.response?.device;
  const requestedDevice = toolCall?.data?.args?.device_id;
  const requestedType = toolCall?.data?.args?.device_type;

  return {
    scheduledState: toolResponse?.data?.response?.scheduled_state,
    scheduledFor: toolResponse?.data?.response?.scheduled_for,
    loadingDeviceName: requestedDevice ?? requestedType ?? fallbackDeviceName,
    finalDeviceName: updatedDevice?.name ?? requestedDevice ?? requestedType ?? fallbackDeviceName,
    deviceType: updatedDevice ? getDeviceType(updatedDevice) : fallbackDeviceType || requestedType || requestedDevice || fallbackDeviceName,
    isDone: Boolean(answer),
    isError: toolResponse?.data?.response?.status === "error",
    errorMessage: toolResponse?.data?.response?.message,
    answerText: answer?.data?.answer || answer?.data?.text || "",
  };
}

export function getAgentAction(message) {
  const normalized = normalizeTypeKey(message);
  if (isAddDeviceRequest(normalized)) return "";
  if (/\b(off|stop|disable|shutdown|shut down)\b/.test(normalized)) return "OFF";
  if (/\b(on|start|enable)\b/.test(normalized)) return "ON";
  return "";
}

export function isAddDeviceRequest(message) {
  return /\b(add|create|install|register)\b/.test(normalizeTypeKey(message));
}

export function getTimingPhrase(message) {
  const normalized = normalizeTypeKey(message);
  const relativeMatch = normalized.match(/\bin\s+\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/);
  if (relativeMatch) return relativeMatch[0];

  const bareRelativeMatch = normalized.match(/\b\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/);
  if (bareRelativeMatch) return `in ${bareRelativeMatch[0]}`;

  const exactMatch = normalized.match(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/);
  if (exactMatch) return exactMatch[0].startsWith("at ") ? exactMatch[0] : `at ${exactMatch[0]}`;

  const dayPartMatch = normalized.match(/\b(?:tomorrow\s+)?(?:morning|afternoon|evening|tonight|night)\b/);
  return dayPartMatch?.[0] ?? "";
}

export function canScheduleAgentMessage(message) {
  const trimmedMessage = message.trim();
  return Boolean(trimmedMessage && getAgentAction(trimmedMessage) && getMentionedDeviceType(trimmedMessage));
}

export function normalizeScheduleTimeInput(value) {
  const normalized = normalizeTypeKey(value);
  if (!normalized) return "";
  if (/^in\s+\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/.test(normalized)) return normalized;
  if (/^\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/.test(normalized)) return `in ${normalized}`;
  if (/^(at\s+)?\d{1,2}(?::\d{2})?\s*(am|pm)\b/.test(normalized)) {
    return normalized.startsWith("at ") ? normalized : `at ${normalized}`;
  }
  if (/^\d+$/.test(normalized)) return `in ${normalized} seconds`;
  return normalized;
}

export function formatScheduledDateTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function getRequestedScheduleTimeText(message) {
  const timingPhrase = getTimingPhrase(message);
  const normalizedTiming = normalizeScheduleTimeInput(timingPhrase);
  if (!normalizedTiming) return "the requested time";

  const relativeMatch = normalizedTiming.match(
    /^in\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/
  );
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const rawUnit = relativeMatch[2];
    const isSeconds = rawUnit.startsWith("sec") || rawUnit === "s";

    if (isSeconds) {
      const unit = amount === 1 ? "second" : "seconds";
      return `in ${amount} ${unit}`;
    }

    const scheduledDate = new Date();
    if (rawUnit.startsWith("hour") || rawUnit.startsWith("hr")) {
      scheduledDate.setHours(scheduledDate.getHours() + amount);
    } else {
      scheduledDate.setMinutes(scheduledDate.getMinutes() + amount);
    }
    return formatScheduledDateTime(scheduledDate);
  }

  return normalizedTiming.replace(/^at\s+/, "");
}


export function parseScheduledFor(value) {
  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) return null;

  const [, year, month, day, hourValue, minuteValue, meridiemValue] = match;
  let hour = Number(hourValue);
  const meridiem = meridiemValue.toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minuteValue), 0, 0);
}

