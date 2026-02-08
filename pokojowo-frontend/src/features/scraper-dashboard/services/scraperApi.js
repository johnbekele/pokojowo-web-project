/**
 * Scraper Dashboard API Service
 */

import api from '@/lib/api';

const SCRAPER_API_BASE = '/scraper';

export const scraperApi = {
  // Jobs
  getJobs: async ({ limit = 20, offset = 0, status, site } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    if (site) params.append('site', site);
    const response = await api.get(`${SCRAPER_API_BASE}/jobs?${params}`);
    return response.data;
  },

  getJob: async (jobId) => {
    const response = await api.get(`${SCRAPER_API_BASE}/jobs/${jobId}`);
    return response.data;
  },

  createJob: async (jobData) => {
    const response = await api.post(`${SCRAPER_API_BASE}/jobs`, jobData);
    return response.data;
  },

  cancelJob: async (jobId) => {
    const response = await api.delete(`${SCRAPER_API_BASE}/jobs/${jobId}`);
    return response.data;
  },

  // Pending Listings
  getPendingListings: async ({ limit = 20, offset = 0, status = 'pending', site, sortBy = 'created_at', sortOrder = 'desc' } = {}) => {
    const params = new URLSearchParams({ limit, offset, status, sort_by: sortBy, sort_order: sortOrder });
    if (site) params.append('site', site);
    const response = await api.get(`${SCRAPER_API_BASE}/pending?${params}`);
    return response.data;
  },

  getPendingListing: async (listingId) => {
    const response = await api.get(`${SCRAPER_API_BASE}/pending/${listingId}`);
    return response.data;
  },

  updatePendingListing: async (listingId, updates) => {
    const response = await api.put(`${SCRAPER_API_BASE}/pending/${listingId}`, updates);
    return response.data;
  },

  searchPendingListings: async (query) => {
    const response = await api.get(`${SCRAPER_API_BASE}/pending/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getQueueStats: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/pending/queue-stats`);
    return response.data;
  },

  // Approval Actions
  approveListing: async (listingId, reviewer = 'admin') => {
    const response = await api.post(`${SCRAPER_API_BASE}/approval/${listingId}`, {
      action: 'approve',
      reviewer,
    });
    return response.data;
  },

  rejectListing: async (listingId, reason, reviewer = 'admin') => {
    const response = await api.post(`${SCRAPER_API_BASE}/approval/${listingId}`, {
      action: 'reject',
      rejection_reason: reason,
      reviewer,
    });
    return response.data;
  },

  bulkApprove: async (listingIds, reviewer = 'admin') => {
    const response = await api.post(`${SCRAPER_API_BASE}/approval/bulk`, {
      listing_ids: listingIds,
      action: 'approve',
      reviewer,
    });
    return response.data;
  },

  bulkReject: async (listingIds, reason, reviewer = 'admin') => {
    const response = await api.post(`${SCRAPER_API_BASE}/approval/bulk`, {
      listing_ids: listingIds,
      action: 'reject',
      rejection_reason: reason,
      reviewer,
    });
    return response.data;
  },

  approveAllPending: async (limit = 100, reviewer = 'admin') => {
    const response = await api.post(`${SCRAPER_API_BASE}/approval/approve-all-pending?limit=${limit}&reviewer=${reviewer}`);
    return response.data;
  },

  getPublishingStatus: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/approval/publishing-status`);
    return response.data;
  },

  // Statistics
  getOverviewStats: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/overview`);
    return response.data;
  },

  getStatsBySite: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/by-site`);
    return response.data;
  },

  getStatsByCity: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/by-city`);
    return response.data;
  },

  getTimelineStats: async (days = 7) => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/timeline?days=${days}`);
    return response.data;
  },

  getQualityMetrics: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/quality`);
    return response.data;
  },

  getRecentActivity: async (limit = 20) => {
    const response = await api.get(`${SCRAPER_API_BASE}/stats/recent-activity?limit=${limit}`);
    return response.data;
  },

  // Health Check
  healthCheck: async () => {
    const response = await api.get(`${SCRAPER_API_BASE}/health`);
    return response.data;
  },
};

export default scraperApi;
