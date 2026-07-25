import { Loader2, Play } from 'lucide-react';
import { useRuns, useStartRun } from '../hooks/useRuns';
import { useToast } from '../components/Toast';
import LiveLogPanel from '../components/runs/LiveLogPanel';
import RunRow from '../components/runs/RunRow';

export default function RunsPage({ runActive }) {
  const toast = useToast();
  const { data: runs, isLoading } = useRuns({ limit: 20, runActive });
  const startRun = useStartRun();

  const handleStart = () => {
    startRun.mutate(
      {},
      {
        onSuccess: (data) => toast.success(data?.message || 'Run started'),
        onError: (err) =>
          err?.status === 409
            ? toast.error('A run is already active')
            : toast.error(`Failed to start run: ${err.message}`),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Scrape runs</h2>
        <button
          onClick={handleStart}
          disabled={runActive || startRun.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {startRun.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {runActive ? 'Run in progress' : 'Start run'}
        </button>
      </div>

      <LiveLogPanel />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading runs...
          </div>
        ) : !runs?.length ? (
          <p className="text-center text-gray-500 py-16 text-sm">No runs yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Trigger</th>
                <th className="px-4 py-3 font-medium">Per-site results</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <RunRow key={run.run_id} run={run} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
