// Shared Axios client used by all frontend API modules.
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

export async function apiRequest(path, options = {}) {
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
