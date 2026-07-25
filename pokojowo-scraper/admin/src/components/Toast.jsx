import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant, message) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const toast = {
    success: useCallback((msg) => push('success', msg), [push]),
    error: useCallback((msg) => push('error', msg), [push]),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-2 rounded-lg shadow-lg border px-4 py-3 text-sm bg-white',
              t.variant === 'success' ? 'border-green-200' : 'border-red-200'
            )}
            role="status"
          >
            {t.variant === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            )}
            <span className="flex-1 text-gray-800">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
