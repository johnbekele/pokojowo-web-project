import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { logStreamUrl } from '../../services/api';

const LEVEL_COLORS = {
  DEBUG: 'text-gray-500',
  INFO: 'text-green-400',
  WARNING: 'text-yellow-400',
  ERROR: 'text-red-400',
  CRITICAL: 'text-red-300',
};

const MAX_LINES = 500;
const MAX_BACKOFF = 30000;

export default function LiveLogPanel() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let source = null;
    let retryTimer = null;
    let backoff = 1000;
    let closed = false;

    const connect = () => {
      source = new EventSource(logStreamUrl());
      source.onopen = () => {
        backoff = 1000;
        setConnected(true);
      };
      source.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data);
          setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), entry]);
        } catch {
          /* skip malformed events */
        }
      };
      source.onerror = () => {
        setConnected(false);
        source.close();
        if (closed) return;
        retryTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF);
      };
    };

    connect();
    return () => {
      closed = true;
      setConnected(false);
      if (retryTimer) clearTimeout(retryTimer);
      if (source) source.close();
    };
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Terminal className="w-4 h-4 text-gray-500" />
        Live logs
        {open && (
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5',
              connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                connected ? 'bg-green-600' : 'bg-yellow-500 animate-pulse'
              )}
            />
            {connected ? 'streaming' : 'reconnecting'}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto bg-gray-900 rounded-b-lg px-4 py-3 font-mono text-xs leading-5"
        >
          {lines.length === 0 ? (
            <p className="text-gray-500">Waiting for log events...</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-gray-500">
                  {line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : ''}
                </span>{' '}
                <span className={cn('font-semibold', LEVEL_COLORS[line.level] || 'text-gray-300')}>
                  {line.level}
                </span>{' '}
                <span className="text-gray-400">{line.logger}</span>{' '}
                <span className="text-gray-100">{line.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
