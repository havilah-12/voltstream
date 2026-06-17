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

