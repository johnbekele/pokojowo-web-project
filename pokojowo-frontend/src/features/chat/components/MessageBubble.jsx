import { useState, useRef } from 'react';
import { Reply, Trash2, MoreVertical, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MessageBubble({
  message,
  isMine,
  currentUserId,
  onReply,
  onDelete,
  onScrollToMessage,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const bubbleRef = useRef(null);

  const isDeleted = message.isDeleted;

  const handleReply = () => {
    onReply?.(message);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete?.(message._id || message.id);
    setShowDeleteDialog(false);
  };

  const handleReplyClick = () => {
    if (message.replyTo && onScrollToMessage) {
      onScrollToMessage(message.replyTo);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div
        ref={bubbleRef}
        id={`message-${message._id || message.id}`}
        className={`group flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Actions Menu - Left side for own messages */}
        {isMine && !isDeleted && (
          <div
            className={`flex items-center mr-2 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={handleReply} className="cursor-pointer">
                  <Reply size={14} className="mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[70%] ${
            isMine
              ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-2xl rounded-br-md'
              : 'bg-card text-card-foreground rounded-2xl rounded-bl-md shadow-sm border border-border'
          }`}
        >
          {/* Reply Preview (if replying to another message) */}
          {message.replyToData && !isDeleted && (
            <div
              onClick={handleReplyClick}
              className={`px-3 pt-2 pb-1 cursor-pointer ${
                isMine
                  ? 'border-l-2 border-blue-300 ml-3 mr-3 mt-2'
                  : 'border-l-2 border-muted-foreground/50 ml-3 mr-3 mt-2'
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isMine ? 'text-blue-200' : 'text-muted-foreground'
                }`}
              >
                Reply to
              </p>
              <p
                className={`text-xs truncate ${
                  isMine ? 'text-blue-100' : 'text-muted-foreground/70'
                }`}
              >
                {message.replyToData.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="px-4 py-2">
            {isDeleted ? (
              <p className={`text-sm italic ${isMine ? 'text-blue-200' : 'text-muted-foreground'}`}>
                Message deleted
              </p>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`px-4 pb-2 ${isMine ? 'text-right' : 'text-left'}`}
          >
            <span
              className={`text-[10px] ${
                isMine ? 'text-blue-200' : 'text-muted-foreground'
              }`}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions Menu - Right side for other's messages */}
        {!isMine && !isDeleted && (
          <div
            className={`flex items-center ml-2 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={handleReply}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Reply"
            >
              <Reply size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
