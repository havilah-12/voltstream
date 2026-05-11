// Device API calls used by smart control and dashboard consumers.
import { apiRequest } from "./client";

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
