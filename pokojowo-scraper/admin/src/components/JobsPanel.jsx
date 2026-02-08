import { useState, useEffect } from 'react';
import { Play, StopCircle, Loader2, RefreshCw, Plus, Terminal } from 'lucide-react';
import { scraperApi } from '../services/api';
import { formatDate, cn } from '../lib/utils';
import LiveJobLogs from './LiveJobLogs';

export default function JobsPanel() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await scraperApi.getJobs({ limit: 50 });
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      await scraperApi.cancelJob(jobId);
      fetchJobs();
    } catch (err) {
      alert('Failed to cancel job: ' + err.message);
    }
  };

  const handleJobCreated = (jobId) => {
    setShowNewJob(false);
    setActiveJobId(jobId);
    fetchJobs();
  };

  const handleLogsClose = () => {
    setActiveJobId(null);
    fetchJobs();
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Scrape Jobs</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowNewJob(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {jobs.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.job_id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusColors[job.status] || statusColors.pending)}>
                        {job.status}
                        {job.status === 'running' && (
                          <Loader2 className="w-3 h-3 ml-1 inline animate-spin" />
                        )}
                      </span>
                      <span className="font-medium text-gray-900">{job.site}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{job.city}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Started: {formatDate(job.created_at)}
                      {job.completed_at && ` • Completed: ${formatDate(job.completed_at)}`}
                    </div>
                    {job.stats && (
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="text-blue-600">{job.stats.total_found || 0} found</span>
                        <span className="text-green-600">{job.stats.saved || 0} saved</span>
                        <span className="text-yellow-600">{job.stats.duplicates || 0} duplicates</span>
                        <span className="text-red-600">{job.stats.failed || 0} failed</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveJobId(job.job_id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="View Logs"
                    >
                      <Terminal className="w-5 h-5" />
                    </button>
                    {job.status === 'running' && (
                      <button
                        onClick={() => handleCancelJob(job.job_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Cancel Job"
                      >
                        <StopCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Play className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No scrape jobs yet</p>
            <p className="text-sm mt-1">Click "New Job" to start scraping</p>
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {showNewJob && (
        <NewJobModal
          onClose={() => setShowNewJob(false)}
          onCreated={handleJobCreated}
        />
      )}

      {/* Live Logs Modal */}
      {activeJobId && (
        <LiveJobLogs
          jobId={activeJobId}
          onClose={handleLogsClose}
          onComplete={fetchJobs}
        />
      )}
    </div>
  );
}

function NewJobModal({ onClose, onCreated }) {
  const [site, setSite] = useState('olx');
  const [city, setCity] = useState('warszawa');
  const [maxListings, setMaxListings] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await scraperApi.createJob({ site, city, max_listings: maxListings });
      onCreated(result.job_id);
    } catch (err) {
      alert('Failed to create job: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Scrape Job</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="olx">OLX.pl</option>
              <option value="otodom">Otodom.pl</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="warszawa">Warszawa</option>
              <option value="krakow">Kraków</option>
              <option value="wroclaw">Wrocław</option>
              <option value="poznan">Poznań</option>
              <option value="gdansk">Gdańsk</option>
              <option value="szczecin">Szczecin</option>
              <option value="lodz">Łódź</option>
              <option value="katowice">Katowice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Listings</label>
            <input
              type="number"
              value={maxListings}
              onChange={(e) => setMaxListings(parseInt(e.target.value) || 20)}
              min={1}
              max={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
