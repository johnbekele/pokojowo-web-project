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
      element.classList.add('bg-yellow-100');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100');
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
      <div className="flex flex-col items-center justify-center p-10">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <p className="text-muted-foreground">{t('error.chatNotFound')}</p>
        <button
          onClick={() => navigate('/chat')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('backToChats')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-200px)] border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted">
        <button
          onClick={() => navigate('/chat')}
          className="p-2 rounded-full hover:bg-accent transition-colors touch-target flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {otherUser?.firstname?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-foreground">
            {otherUser?.firstname} {otherUser?.lastname}
          </div>
          <div className="text-xs text-muted-foreground">
            {otherUser?.isOnline ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                {t('online')}
              </span>
            ) : (
              t('offline')
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-muted/50"
      >
        {messagesLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">{t('loadingMessages')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <p>{t('noMessages')}</p>
            <p className="text-sm">{t('startConversation')}</p>
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
        className="flex gap-3 px-4 py-3 border-t border-border bg-card pb-safe"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={replyingTo ? t('replyPlaceholder') : t('inputPlaceholder')}
          className="flex-1 px-4 py-3 border border-input bg-background rounded-full outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all text-base md:text-sm"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors touch-target active:scale-95 ${
            message.trim()
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
