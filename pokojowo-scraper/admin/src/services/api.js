/**
 * Scraper Admin API service — thin fetch wrapper, one function per endpoint.
 * All React Query usage lives in src/hooks/; components never call these directly.
 */

const BASE = '/api/scraper';
const DASHBOARD_KEY = import.meta.env.VITE_SCRAPER_DASHBOARD_KEY || '';
const ADMIN_KEY = import.meta.env.VITE_SCRAPER_DASHBOARD_ADMIN_KEY || DASHBOARD_KEY;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, params, admin = false } = {}) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') qs.append(key, value);
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const headers = { 'X-Internal-Key': admin ? ADMIN_KEY : DASHBOARD_KEY };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || data.message || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Health
export const getHealth = () => request('/health');

// Runs
export const getRuns = ({ limit = 20, skip = 0 } = {}) =>
  request('/runs', { params: { limit, skip } });

export const startRun = ({ site, city } = {}) =>
  request('/runs', { method: 'POST', params: { site, city }, admin: true });

// SSE log stream — consumers create their own EventSource from this URL.
export const logStreamUrl = () => `${BASE}/logs/stream?key=${encodeURIComponent(DASHBOARD_KEY)}`;

// Queue
export const getQueue = ({ status, limit = 24, skip = 0 } = {}) =>
  request('/queue', { params: { status, limit, skip } });

export const getQueueStats = () => request('/queue/stats');

export const updateListing = (id, edits) =>
  request(`/queue/${id}`, { method: 'PUT', body: { edits }, admin: true });

export const decideListing = (id, { action, reason }) =>
  request(`/queue/${id}/decision`, {
    method: 'POST',
    admin: true,
    body: reason ? { action, reason } : { action },
  });

export const annotateListing = (id, { field, issue, comment, corrected_value }) =>
  request(`/queue/${id}/annotate`, {
    method: 'POST',
    admin: true,
    body: { field, issue, ...(comment ? { comment } : {}), ...(corrected_value ? { corrected_value } : {}) },
  });

// Annotations
export const getAnnotations = ({ limit = 50, skip = 0 } = {}) =>
  request('/annotations', { params: { limit, skip } });

// Metrics
export const getPrecisionMetrics = (days = 30) =>
  request('/metrics/precision', { params: { days } });

export const getQualityMetrics = (days = 30) =>
  request('/metrics/quality', { params: { days } });
