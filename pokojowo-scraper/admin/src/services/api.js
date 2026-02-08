/**
 * Scraper Admin API Service
 */

import axios from 'axios';

const API_BASE = '/api/scraper';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scraperApi = {
  // Health Check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Jobs
  getJobs: async ({ limit = 20, offset = 0, status, site } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    if (site) params.append('site', site);
    const response = await api.get(`/jobs?${params}`);
    return response.data;
  },

  getJob: async (jobId) => {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },

  createJob: async (jobData) => {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  cancelJob: async (jobId) => {
    const response = await api.delete(`/jobs/${jobId}`);
    return response.data;
  },

  getJobLogs: async (jobId, limit = 100) => {
    const response = await api.get(`/jobs/${jobId}/logs?limit=${limit}`);
    return response.data;
  },

  // Returns EventSource for SSE streaming
  streamJobLogs: (jobId) => {
    return new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
  },

  // Pending Listings
  getPendingListings: async ({ limit = 20, offset = 0, status = 'pending', site, sortBy = 'created_at', sortOrder = 'desc' } = {}) => {
    const params = new URLSearchParams({ limit, offset, status, sort_by: sortBy, sort_order: sortOrder });
    if (site) params.append('site', site);
    const response = await api.get(`/pending?${params}`);
    return response.data;
  },

  getPendingListing: async (listingId) => {
    const response = await api.get(`/pending/${listingId}`);
    return response.data;
  },

  updatePendingListing: async (listingId, updates) => {
    const response = await api.put(`/pending/${listingId}`, updates);
    return response.data;
  },

  searchPendingListings: async (query) => {
    const response = await api.get(`/pending/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getQueueStats: async () => {
    const response = await api.get('/pending/queue-stats');
    return response.data;
  },

  // Approval Actions
  approveListing: async (listingId, reviewer = 'admin') => {
    const response = await api.post(`/approval/${listingId}`, {
      action: 'approve',
      reviewer,
    });
    return response.data;
  },

  rejectListing: async (listingId, reason, reviewer = 'admin') => {
    const response = await api.post(`/approval/${listingId}`, {
      action: 'reject',
      rejection_reason: reason,
      reviewer,
    });
    return response.data;
  },

  bulkApprove: async (listingIds, reviewer = 'admin') => {
    const response = await api.post('/approval/bulk', {
      listing_ids: listingIds,
      action: 'approve',
      reviewer,
    });
    return response.data;
  },

  bulkReject: async (listingIds, reason, reviewer = 'admin') => {
    const response = await api.post('/approval/bulk', {
      listing_ids: listingIds,
      action: 'reject',
      rejection_reason: reason,
      reviewer,
    });
    return response.data;
  },

  approveAllPending: async (limit = 100, reviewer = 'admin') => {
    const response = await api.post(`/approval/approve-all-pending?limit=${limit}&reviewer=${reviewer}`);
    return response.data;
  },

  getPublishingStatus: async () => {
    const response = await api.get('/approval/publishing-status');
    return response.data;
  },

  // Statistics
  getOverviewStats: async () => {
    const response = await api.get('/stats/overview');
    return response.data;
  },

  getStatsBySite: async () => {
    const response = await api.get('/stats/by-site');
    return response.data;
  },

  getStatsByCity: async () => {
    const response = await api.get('/stats/by-city');
    return response.data;
  },

  getTimelineStats: async (days = 7) => {
    const response = await api.get(`/stats/timeline?days=${days}`);
    return response.data;
  },

  getQualityMetrics: async () => {
    const response = await api.get('/stats/quality');
    return response.data;
  },

  getRecentActivity: async (limit = 20) => {
    const response = await api.get(`/stats/recent-activity?limit=${limit}`);
    return response.data;
  },
};

export default scraperApi;
