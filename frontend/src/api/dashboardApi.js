// Dashboard API calls used by the live dashboard page.
import { apiRequest } from "./client";

export async function fetchLiveDashboard() {
  return apiRequest("/dashboard/live");
}
