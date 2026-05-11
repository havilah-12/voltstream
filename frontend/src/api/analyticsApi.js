// Analytics API calls used by the usage history and dashboard charts.
import { apiRequest } from "./client";

export async function fetchAnalyticsHistory(period = "daily") {
  return apiRequest(`/analytics/history?period=${encodeURIComponent(period)}`);
}
