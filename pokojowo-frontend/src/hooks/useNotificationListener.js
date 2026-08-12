import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getSocket, connectSocket } from '@/lib/socket';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import useLikesStore from '@/stores/likesStore';
import useAuthStore from '@/stores/authStore';

/**
 * Hook to listen for real-time notifications from socket
 * Should be used in the main App component
 */
export function useNotificationListener() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setMutualMatchData } = useLikesStore();
  const { isAuthenticated, token } = useAuthStore();
  const listenersAttached = useRef(false);
  const socketRef = useRef(null);

  // Memoize handlers to prevent unnecessary re-attachments
  const handleNotification = useCallback((data) => {
    switch (data.type) {
      case 'new_message':
        toast({
          title: 'New Message',
          description: data.preview || 'You have a new message',
          variant: 'default',
        });
        // Invalidate chat list to show updated last message
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        break;

      case 'new_like':
        toast({
          title: 'Someone is interested!',
          description: data.message || `${data.likerName} wants to be your flatmate`,
          variant: 'default',
        });
        // Invalidate likes queries to show new like
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-dashboard'] });
        break;

      case 'mutual_match':
        // Show celebration modal
        setMutualMatchData({
          matchedUserId: data.matchedUserId,
          matchedUserName: data.matchedUserName,
          matchedUserPhoto: data.matchedUserPhoto,
        });
        // Also show toast as backup
        toast({
          title: "You're Connected!",
          description: data.message || `You and ${data.matchedUserName} are both interested!`,
          variant: 'default',
        });
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        break;

      case 'saved_search_match':
        toast({
          title: t('notifications.savedSearchMatch', 'New listing matches your search'),
          description: data.savedSearchName || data.message,
          variant: 'default',
        });
        break;

      default:
        break;
    }
  }, [t, toast, queryClient, setMutualMatchData]);

  const handleUserStatus = useCallback(() => {
    // Invalidate queries that might show user online status
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    queryClient.invalidateQueries({ queryKey: ['chat'] });
  }, [queryClient]);

  const handleConnection = useCallback((data) => {
    if (!data.authenticated && data.error) console.warn('Socket authentication failed');
  }, []);

  const handleNewMessage = useCallback((data) => {
    // Invalidate chat queries to update UI
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    if (data.chatId) {
      queryClient.invalidateQueries({ queryKey: ['chat', data.chatId] });
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
    }
  }, [queryClient]);

  // Attach listeners function
  const attachListeners = useCallback((socket) => {
    if (!socket || listenersAttached.current) return;

    socket.on('notification', handleNotification);
    socket.on('user_status', handleUserStatus);
    socket.on('connection', handleConnection);
    socket.on('new_message', handleNewMessage);

    listenersAttached.current = true;
    socketRef.current = socket;
  }, [handleNotification, handleUserStatus, handleConnection, handleNewMessage]);

  // Detach listeners function
  const detachListeners = useCallback((socket) => {
    if (!socket) return;

    socket.off('notification', handleNotification);
    socket.off('user_status', handleUserStatus);
    socket.off('connection', handleConnection);
    socket.off('new_message', handleNewMessage);

    listenersAttached.current = false;
    socketRef.current = null;
  }, [handleNotification, handleUserStatus, handleConnection, handleNewMessage]);

  useEffect(() => {
    // Only proceed if authenticated
    if (!isAuthenticated || !token) {
      return;
    }

    // Get or connect socket
    let socket = getSocket();

    if (!socket) {
      socket = connectSocket(token);
    }

    if (!socket) {
      console.warn('Could not establish socket connection');
      return;
    }

    // If socket is already connected, attach listeners immediately
    if (socket.connected) {
      attachListeners(socket);
    }

    // Also attach on connect event (for reconnections or initial connect)
    const handleConnect = () => {
      // Reset flag to allow re-attachment after reconnection
      listenersAttached.current = false;
      attachListeners(socket);
    };

    const handleDisconnect = () => {
      // Don't detach listeners - they'll be re-attached on reconnect
    };

    const handleError = () => {
      console.error('Socket error');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      detachListeners(socket);
    };
  }, [isAuthenticated, token, attachListeners, detachListeners]);
}

export default useNotificationListener;
