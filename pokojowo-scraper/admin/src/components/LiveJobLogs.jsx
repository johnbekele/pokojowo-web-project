import { useState, useEffect, useRef } from 'react';
import { Terminal, X, Loader2, CheckCircle, AlertCircle, Info, Bug } from 'lucide-react';
import { scraperApi } from '../services/api';
import { cn } from '../lib/utils';

const STAGE_LABELS = {
  init: 'Initializing',
  collecting: 'Collecting Listings',
  dedup: 'Deduplicating',
  saving: 'Saving to Database',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STAGE_COLORS = {
  init: 'text-blue-600',
  collecting: 'text-purple-600',
  dedup: 'text-yellow-600',
  saving: 'text-green-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  cancelled: 'text-orange-600',
};

const LEVEL_ICONS = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  debug: <Bug className="w-4 h-4 text-gray-500" />,
  warning: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export default function LiveJobLogs({ jobId, onClose, onComplete }) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStage, setCurrentStage] = useState('init');
  const [stats, setStats] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    // Connect to SSE stream
    const eventSource = scraperApi.streamJobLogs(jobId);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        // Check for stream end
        if (log.stage === 'stream_end') {
          eventSource.close();
          setIsConnected(false);
          if (onComplete) onComplete();
          return;
        }

        setLogs((prev) => [...prev, log]);
        setCurrentStage(log.stage);

        // Update stats from completed log
        if (log.stage === 'completed' || log.stage === 'failed') {
          setStats(log.data);
          eventSource.close();
          setIsConnected(false);
          if (onComplete) onComplete();
        }
      } catch (e) {
        console.error('Error parsing log:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = showDebug ? logs : logs.filter((l) => l.level !== 'debug');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-white font-medium">Live Job Logs</span>
            <span className="text-gray-400 text-sm font-mono">{jobId}</span>
          </div>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                Disconnected
              </span>
            )}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={cn(
                'px-2 py-1 text-xs rounded',
                showDebug ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-400'
              )}
            >
              Debug
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Stage:</span>
            <span className={cn('font-medium', STAGE_COLORS[currentStage] || 'text-gray-400')}>
              {STAGE_LABELS[currentStage] || currentStage}
            </span>
            {isConnected && currentStage !== 'completed' && currentStage !== 'failed' && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            )}
            {currentStage === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
            {currentStage === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
          </div>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Waiting for logs...
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, i) => (
                <LogEntry key={i} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Stats Footer */}
        {stats && (
          <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Found:</span>
                <span className="text-white font-medium">{stats.total_found || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Saved:</span>
                <span className="text-green-400 font-medium">{stats.saved || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Duplicates:</span>
                <span className="text-yellow-400 font-medium">{stats.duplicates || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Failed:</span>
                <span className="text-red-400 font-medium">{stats.failed || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ log }) {
  const time = new Date(log.timestamp).toLocaleTimeString();

  return (
    <div className="flex items-start gap-2 hover:bg-gray-800/50 px-2 py-1 rounded">
      <span className="text-gray-600 flex-shrink-0">{time}</span>
      <span className="flex-shrink-0">{LEVEL_ICONS[log.level] || LEVEL_ICONS.info}</span>
      <span className={cn('flex-shrink-0 w-20', STAGE_COLORS[log.stage] || 'text-gray-400')}>
        [{log.stage}]
      </span>
      <span className="text-gray-300">{log.message}</span>
      {log.data && Object.keys(log.data).length > 0 && (
        <span className="text-gray-500 ml-2">
          {Object.entries(log.data)
            .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join(' ')}
        </span>
      )}
    </div>
  );
}
