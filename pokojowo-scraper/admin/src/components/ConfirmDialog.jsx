import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Small confirmation dialog. When `withInput` is set, shows a text input
 * (e.g. reject reason) and passes its value to onConfirm.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary', // 'primary' | 'danger' | 'success'
  withInput = false,
  inputLabel,
  inputRequired = false,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  if (!open) return null;

  const confirmDisabled = withInput && inputRequired && !value.trim();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-sm mx-4 p-5">
        <div className="flex items-center gap-2 mb-2">
          {variant === 'danger' && <AlertTriangle className="w-5 h-5 text-red-600" />}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
        {withInput && (
          <div className="mb-4">
            {inputLabel && (
              <label className="block text-xs font-medium text-gray-600 mb-1">{inputLabel}</label>
            )}
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !confirmDisabled) onConfirm(value.trim());
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={confirmDisabled}
            onClick={() => onConfirm(withInput ? value.trim() : undefined)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50',
              variant === 'danger' && 'bg-red-600 hover:bg-red-700',
              variant === 'success' && 'bg-green-600 hover:bg-green-700',
              variant === 'primary' && 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
