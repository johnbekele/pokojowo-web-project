import { X } from 'lucide-react';

export default function ReplyPreview({ message, onCancel, className = '' }) {
  if (!message) return null;

  const truncatedContent = message.content?.length > 80
    ? message.content.substring(0, 80) + '...'
    : message.content;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 bg-gray-50 border-l-4 border-blue-500 ${className}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-blue-600">
          Replying to message
        </p>
        <p className="text-sm text-gray-600 truncate">
          {message.isDeleted ? 'Message deleted' : truncatedContent}
        </p>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cancel reply"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
