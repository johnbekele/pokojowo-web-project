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
                  className="cursor-pointer text-destructive focus:text-destructive"
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
          className={`max-w-[75%] shadow-editorial ${
            isMine
              ? 'rounded-3xl rounded-br-md bg-foreground text-background'
              : 'rounded-3xl rounded-bl-md border border-border/70 bg-card text-card-foreground'
          }`}
        >
          {/* Reply Preview (if replying to another message) */}
          {message.replyToData && !isDeleted && (
            <div
              onClick={handleReplyClick}
              className={`mx-3 mt-3 cursor-pointer rounded-lg px-3 py-2 ${
                isMine
                  ? 'border-l-2 border-accent bg-background/10'
                  : 'border-l-2 border-border bg-surface-parchment'
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  isMine ? 'text-background/60' : 'text-muted-foreground'
                }`}
              >
                Reply to
              </p>
              <p
                className={`mt-0.5 truncate text-xs ${
                  isMine ? 'text-background/80' : 'text-muted-foreground/80'
                }`}
              >
                {message.replyToData.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="px-4 py-3">
            {isDeleted ? (
              <p
                className={`font-display text-sm italic ${
                  isMine ? 'text-background/65' : 'text-muted-foreground'
                }`}
              >
                Message deleted
              </p>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
            )}
          </div>

          {/* Timestamp */}
          <div className={`px-4 pb-2 ${isMine ? 'text-right' : 'text-left'}`}>
            <span
              className={`text-[10px] uppercase tracking-[0.16em] ${
                isMine ? 'text-background/55' : 'text-muted-foreground/80'
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
