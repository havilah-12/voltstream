import { clearResponseCache } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function parseSseBlock(block) {
  const lines = block.split("\n");
  const event = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
  const dataText = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trim())
    .join("\n");

  if (!event || !dataText) return null;

  try {
    return { event, data: JSON.parse(dataText) };
  } catch {
    return { event, data: { message: dataText } };
  }
}

export async function runDeviceAgent(message, { signal, onEvent } = {}) {
  const response = await fetch(`${API_BASE_URL}/agent`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Agent request failed with ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Agent stream is not available.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    blocks.forEach((block) => {
      const parsed = parseSseBlock(block.trim());
      if (parsed) onEvent?.(parsed);
    });
  }

  const parsed = parseSseBlock(buffer.trim());
  if (parsed) onEvent?.(parsed);

  clearResponseCache();
}
