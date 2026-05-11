// Billing API calls used by invoices and dashboard bill metrics.
import { apiRequest } from "./client";

export async function fetchBillingSummary() {
  return apiRequest("/billing/summary");
}
