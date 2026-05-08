const CLOUD_RUN_API_BASE_URL = "https://voltstream-api-2321325123.us-east4.run.app/api/v1";

const DEFAULT_API_BASE_URLS = [
  "/api/v1",
  CLOUD_RUN_API_BASE_URL,
  "http://localhost:8000/api/v1",
  "http://localhost:8001/api/v1",
];

const API_BASE_URLS = import.meta.env.VITE_API_BASE_URL
  ? [import.meta.env.VITE_API_BASE_URL]
  : DEFAULT_API_BASE_URLS;

async function apiRequest(path, options) {
  let lastError;

  for (const baseUrl of API_BASE_URLS) {
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      if (!res.ok) {
        lastError = new Error(`API request failed with ${res.status}`);
        continue;
      }

      return res.json();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("API request failed");
}

export async function fetchLiveDashboard() {
  return apiRequest("/dashboard/live");
}

export async function fetchAnalyticsHistory(period = "daily") {
  return apiRequest(`/analytics/history?period=${encodeURIComponent(period)}`);
}

export async function fetchDevices() {
  return apiRequest("/devices/");
}

export async function updateDeviceStatus(id, status) {
  return apiRequest(`/devices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function createDevice(device) {
  return apiRequest("/devices/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
}

export async function updateDevice(id, device) {
  return apiRequest(`/devices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
}

export async function deleteDevice(id) {
  return apiRequest(`/devices/${id}`, {
    method: "DELETE",
  });
}

export async function fetchBillingSummary() {
  return apiRequest("/billing/summary");
}
