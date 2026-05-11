import axios from "axios";

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

async function apiRequest(path, options = {}) {
  let lastError;

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await axios({
        url: `${baseUrl}${path}`,
        timeout: 8000,
        ...options,
      });

      return response.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError?.response
    ? new Error(`API request failed with ${lastError.response.status}`)
    : lastError ?? new Error("API request failed");
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
    method: "patch",
    data: { status },
  });
}

export async function createDevice(device) {
  return apiRequest("/devices/", {
    method: "post",
    data: device,
  });
}

export async function updateDevice(id, device) {
  return apiRequest(`/devices/${id}`, {
    method: "put",
    data: device,
  });
}

export async function deleteDevice(id) {
  return apiRequest(`/devices/${id}`, {
    method: "delete",
  });
}

export async function fetchBillingSummary() {
  return apiRequest("/billing/summary");
}
