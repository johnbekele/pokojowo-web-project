/**
 * React Query hooks for Scraper Dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scraperApi } from '../services/scraperApi';

// Query Keys
export const scraperKeys = {
  all: ['scraper'],
  jobs: () => [...scraperKeys.all, 'jobs'],
  job: (id) => [...scraperKeys.jobs(), id],
  pending: () => [...scraperKeys.all, 'pending'],
  pendingList: (filters) => [...scraperKeys.pending(), 'list', filters],
  pendingItem: (id) => [...scraperKeys.pending(), id],
  queueStats: () => [...scraperKeys.pending(), 'queue-stats'],
  stats: () => [...scraperKeys.all, 'stats'],
  overview: () => [...scraperKeys.stats(), 'overview'],
  bySite: () => [...scraperKeys.stats(), 'by-site'],
  byCity: () => [...scraperKeys.stats(), 'by-city'],
  timeline: (days) => [...scraperKeys.stats(), 'timeline', days],
  quality: () => [...scraperKeys.stats(), 'quality'],
  activity: () => [...scraperKeys.stats(), 'activity'],
  publishingStatus: () => [...scraperKeys.all, 'publishing-status'],
};

// Jobs Hooks
export function useJobs(filters = {}) {
  return useQuery({
    queryKey: scraperKeys.jobs(),
    queryFn: () => scraperApi.getJobs(filters),
    refetchInterval: 10000, // Refresh every 10 seconds for active jobs
  });
}

export function useJob(jobId) {
  return useQuery({
    queryKey: scraperKeys.job(jobId),
    queryFn: () => scraperApi.getJob(jobId),
    enabled: !!jobId,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scraperApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.jobs() });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scraperApi.cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.jobs() });
    },
  });
}

// Pending Listings Hooks
export function usePendingListings(filters = {}) {
  return useQuery({
    queryKey: scraperKeys.pendingList(filters),
    queryFn: () => scraperApi.getPendingListings(filters),
  });
}

export function usePendingListing(listingId) {
  return useQuery({
    queryKey: scraperKeys.pendingItem(listingId),
    queryFn: () => scraperApi.getPendingListing(listingId),
    enabled: !!listingId,
  });
}

export function useUpdatePendingListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, updates }) => scraperApi.updatePendingListing(listingId, updates),
    onSuccess: (_, { listingId }) => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pendingItem(listingId) });
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
    },
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: scraperKeys.queueStats(),
    queryFn: scraperApi.getQueueStats,
    refetchInterval: 30000,
  });
}

// Approval Hooks
export function useApproveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, reviewer }) => scraperApi.approveListing(listingId, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
      queryClient.invalidateQueries({ queryKey: scraperKeys.stats() });
    },
  });
}

export function useRejectListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, reason, reviewer }) => scraperApi.rejectListing(listingId, reason, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
      queryClient.invalidateQueries({ queryKey: scraperKeys.stats() });
    },
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingIds, reviewer }) => scraperApi.bulkApprove(listingIds, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
      queryClient.invalidateQueries({ queryKey: scraperKeys.stats() });
    },
  });
}

export function useBulkReject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingIds, reason, reviewer }) => scraperApi.bulkReject(listingIds, reason, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
      queryClient.invalidateQueries({ queryKey: scraperKeys.stats() });
    },
  });
}

export function useApproveAllPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ limit, reviewer }) => scraperApi.approveAllPending(limit, reviewer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.pending() });
      queryClient.invalidateQueries({ queryKey: scraperKeys.stats() });
    },
  });
}

// Stats Hooks
export function useOverviewStats() {
  return useQuery({
    queryKey: scraperKeys.overview(),
    queryFn: scraperApi.getOverviewStats,
    refetchInterval: 30000,
  });
}

export function useStatsBySite() {
  return useQuery({
    queryKey: scraperKeys.bySite(),
    queryFn: scraperApi.getStatsBySite,
  });
}

export function useStatsByCity() {
  return useQuery({
    queryKey: scraperKeys.byCity(),
    queryFn: scraperApi.getStatsByCity,
  });
}

export function useTimelineStats(days = 7) {
  return useQuery({
    queryKey: scraperKeys.timeline(days),
    queryFn: () => scraperApi.getTimelineStats(days),
  });
}

export function useQualityMetrics() {
  return useQuery({
    queryKey: scraperKeys.quality(),
    queryFn: scraperApi.getQualityMetrics,
  });
}

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: scraperKeys.activity(),
    queryFn: () => scraperApi.getRecentActivity(limit),
    refetchInterval: 15000,
  });
}

export function usePublishingStatus() {
  return useQuery({
    queryKey: scraperKeys.publishingStatus(),
    queryFn: scraperApi.getPublishingStatus,
    refetchInterval: 30000,
  });
}
