// Shared Axios client used by all frontend API modules.
import axios from "axios";

const GET_CACHE_TTL_MS = 30_000;

const DEFAULT_API_BASE_URLS = [
  "http://localhost:8000/api/v1",
];

const API_BASE_URLS = import.meta.env.VITE_API_BASE_URL
  ? [import.meta.env.VITE_API_BASE_URL]
  : DEFAULT_API_BASE_URLS;

let preferredBaseUrl = null;
const responseCache = new Map();
const pendingRequests = new Map();

function buildOrderedBaseUrls() {
  if (!preferredBaseUrl) return API_BASE_URLS;
  return [preferredBaseUrl, ...API_BASE_URLS.filter((baseUrl) => baseUrl !== preferredBaseUrl)];
}

function getCacheKey(method, path) {
  return `${method.toUpperCase()}::${path}`;
}

function readCachedResponse(cacheKey) {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > GET_CACHE_TTL_MS) {
    responseCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function clearResponseCache() {
  responseCache.clear();
  pendingRequests.clear();
}

export async function apiRequest(path, options = {}) {
  const method = (options.method ?? "get").toLowerCase();
  const cacheKey = getCacheKey(method, path);
  const isGetRequest = method === "get";

  if (isGetRequest) {
    const cached = readCachedResponse(cacheKey);
    if (cached) return cached;

    const pending = pendingRequests.get(cacheKey);
    if (pending) return pending;
  }

  const requestPromise = (async () => {
  let lastError;

  for (const baseUrl of buildOrderedBaseUrls()) {
    try {
      const response = await axios({
        url: `${baseUrl}${path}`,
        timeout: options.timeout ?? 30000,
        ...options,
      });

      preferredBaseUrl = baseUrl;
      if (isGetRequest) {
        responseCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
      } else {
        clearResponseCache();
      }
      return response.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError?.response
    ? new Error(`API request failed with ${lastError.response.status}`)
    : lastError ?? new Error("API request failed");
  })();

  if (!isGetRequest) {
    return requestPromise;
  }

  pendingRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}
