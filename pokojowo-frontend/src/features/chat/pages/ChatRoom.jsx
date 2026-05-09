import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { getSocket, connectSocket, trackRoom, untrackRoom } from '@/lib/socket';
import useAuthStore from '@/stores/authStore';
import MessageBubble from '../components/MessageBubble';
import ReplyPreview from '../components/ReplyPreview';

export default function ChatRoom() {
  const { t } = useTranslation('chat');
  const { chatId, userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);

  const currentUserId = currentUser?._id || currentUser?.id;

  // 1. Fetch chat data
  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['chat', chatId || userId],
    queryFn: async () => {
      if (chatId) {
        const res = await api.get(`/chat/${chatId}`);
        return res.data;
      } else if (userId) {
        const res = await api.get(`/chat/with/${userId}`);
        return res.data;
      }
      throw new Error('No chat or user ID');
    },
  });

  const roomId = chat?._id || chat?.id;
  const otherUser = chat?.otherUser;

  // 2. Fetch messages from DB when roomId is available
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      console.log('FETCHING MESSAGES FROM DB for room:', roomId);
      const res = await api.get(`/messages/room/${roomId}`);
      console.log('MESSAGES FROM DB:', res.data);
      return res.data || [];
    },
    enabled: !!roomId,
    staleTime: 0,
  });

  // Scroll to a specific message
  const scrollToMessage = useCallback((messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight effect
      element.classList.add('ring-2', 'ring-accent');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-accent');
      }, 1500);
    }
  }, []);

  // Handle reply action
  const handleReply = useCallback((msg) => {
    setReplyingTo(msg);
  }, []);

  // Handle delete action
  const handleDelete = useCallback((messageId) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('delete_message', { messageId });
    } else {
      // Fallback to REST API
      api.delete(`/messages/${messageId}`).then(() => {
        // Update local cache
        queryClient.setQueryData(['messages', roomId], (old = []) =>
          old.map((m) =>
            (m._id || m.id) === messageId
              ? { ...m, isDeleted: true, content: null }
              : m
          )
        );
      }).catch((err) => {
        console.error('Delete failed:', err);
      });
    }
  }, [roomId, queryClient]);

  // 3. Socket: connect and listen for real-time messages
  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket() || connectSocket();
    if (!socket) return;
    socketRef.current = socket;

    const handleNewMessage = (data) => {
      console.log('SOCKET: new_message received', data);
      if (data.chatId === roomId && data.message) {
        queryClient.setQueryData(['messages', roomId], (old = []) => {
          const msgId = data.message._id || data.message.id;
          const senderId = data.message.sender || data.message.senderId;

          // If this is our own message, remove the optimistic version
          if (senderId === currentUserId) {
            // Filter out any pending messages with matching content (optimistic)
            const filtered = old.filter((m) => {
              if (m.isPending && m.content === data.message.content) {
                return false; // Remove optimistic message
              }
              return (m._id || m.id) !== msgId; // Also prevent duplicates
            });
            return [...filtered, { ...data.message, isPending: false }];
          }

          // For messages from others, just add if not duplicate
          if (old.some((m) => (m._id || m.id) === msgId)) {
            return old;
          }
          return [...old, data.message];
        });
      }
    };

    const handleMessageDeleted = (data) => {
      console.log('SOCKET: message_deleted received', data);
      if (data.chatId === roomId && data.messageId) {
        queryClient.setQueryData(['messages', roomId], (old = []) =>
          old.map((m) =>
            (m._id || m.id) === data.messageId
              ? { ...m, isDeleted: true, content: null }
              : m
          )
        );
      }
    };

    const handleMessageSent = (data) => {
      console.log('SOCKET: message_sent', data);
      // Message already added optimistically, nothing to do
    };

    const handleDeleteSuccess = (data) => {
      console.log('SOCKET: delete_success', data);
    };

    const handleError = (data) => {
      console.error('SOCKET: error', data);
      // Could handle failed optimistic messages here if needed
    };

    const joinRoom = () => {
      if (socket.connected) {
        console.log('SOCKET: joining room', roomId);
        socket.emit('join_chat', { chatId: roomId });
      }
    };

    // Track this room for auto-rejoin on reconnect
    trackRoom(roomId);

    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_sent', handleMessageSent);
    socket.on('delete_success', handleDeleteSuccess);
    socket.on('error', handleError);
    // Use 'on' instead of 'once' to handle reconnections
    socket.on('connect', joinRoom);

    // Join immediately if already connected
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_sent', handleMessageSent);
      socket.off('delete_success', handleDeleteSuccess);
      socket.off('error', handleError);
      socket.off('connect', joinRoom);
      untrackRoom(roomId);
      if (socket.connected) {
        socket.emit('leave_chat', { chatId: roomId });
      }
    };
  }, [roomId, queryClient]);

  // 4. Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Send message (optimistic update)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !roomId) return;

    const content = message.trim();
    const replyToId = replyingTo?._id || replyingTo?.id;
    const tempId = `temp-${Date.now()}`;

    // Clear input immediately for snappy feel
    setMessage('');
    setReplyingTo(null);

    // Optimistic: Add message to UI immediately
    const optimisticMessage = {
      _id: tempId,
      id: tempId,
      content,
      sender: currentUserId,
      senderId: currentUserId,
      roomId: roomId,
      createdAt: new Date().toISOString(),
      replyTo: replyToId,
      isPending: true, // Mark as pending
    };

    queryClient.setQueryData(['messages', roomId], (old = []) => [
      ...old,
      optimisticMessage,
    ]);

    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit('send_message', {
        chatId: roomId,
        content,
        replyTo: replyToId || null,
        tempId, // Send tempId to correlate with server response
      });
    } else {
      // Fallback to REST API
      try {
        const res = await api.post('/messages/', {
          roomId: roomId,
          content,
          replyTo: replyToId || null,
        });
        // Replace optimistic message with real one
        queryClient.setQueryData(['messages', roomId], (old = []) =>
          old.map((m) =>
            m._id === tempId
              ? { ...res.data, _id: res.data._id, id: res.data._id, isPending: false }
              : m
          )
        );
      } catch (err) {
        console.error('Send failed:', err);
        // Remove optimistic message on failure
        queryClient.setQueryData(['messages', roomId], (old = []) =>
          old.filter((m) => m._id !== tempId)
        );
        // Restore the message to input
        setMessage(content);
      }
    }
  };

  // Loading state
  if (chatLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 size={28} className="animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm text-muted-foreground">{t('error.chatNotFound')}</p>
        <button
          onClick={() => navigate('/chat')}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-surface-ink"
        >
          {t('backToChats')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-editorial">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-surface-paper px-5 py-4">
        <button
          onClick={() => navigate('/chat')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-parchment hover:text-foreground touch-target"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground font-display text-base font-medium text-background">
            {otherUser?.firstname?.[0]?.toUpperCase() || '?'}
          </div>
          {otherUser?.isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-olive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-medium tracking-editorial text-foreground">
            {otherUser?.firstname} {otherUser?.lastname}
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {otherUser?.isOnline ? t('online', 'Online') : t('offline', 'Offline')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="relative flex-1 overflow-y-auto bg-surface-canvas px-4 py-6 md:px-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grain opacity-30"
        />
        {messagesLoading ? (
          <div className="relative flex flex-col items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="mt-2 text-sm text-muted-foreground">{t('loadingMessages')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center py-16 text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-surface-paper text-muted-foreground">
              <Send className="h-5 w-5" />
            </span>
            <p className="font-display text-lg font-medium text-foreground">{t('noMessages', 'A blank page awaits')}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t('startConversation', 'Say hello — the rest writes itself.')}</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const senderId = msg.sender || msg.senderId;
              const isMine = senderId === currentUserId;
              return (
                <MessageBubble
                  key={msg._id || msg.id || idx}
                  message={msg}
                  isMine={isMine}
                  currentUserId={currentUserId}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onScrollToMessage={scrollToMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <ReplyPreview
          message={replyingTo}
          onCancel={() => setReplyingTo(null)}
          className="border-t border-border"
        />
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-3 border-t border-border/60 bg-surface-paper px-4 py-3 pb-safe md:px-5"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={replyingTo ? t('replyPlaceholder') : t('inputPlaceholder')}
          className="flex-1 rounded-full border border-border/70 bg-card px-5 py-3 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-2 focus:ring-ring/30 md:text-sm"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 touch-target active:scale-95 ${
            message.trim()
              ? 'bg-foreground text-background shadow-[0_4px_18px_hsl(var(--surface-onyx)/0.18)] hover:bg-surface-ink'
              : 'bg-surface-parchment text-muted-foreground cursor-not-allowed'
          }`}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
