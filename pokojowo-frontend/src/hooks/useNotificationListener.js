import { useEffect, useRef } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import useLikesStore from '@/stores/likesStore';

/**
 * Hook to listen for real-time notifications from socket
 * Should be used in the main App component
 */
export function useNotificationListener() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setMutualMatchData, fetchStats } = useLikesStore();
  const listenersAttached = useRef(false);

  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket || listenersAttached.current) return;

    const handleNotification = (data) => {
      console.log('NOTIFICATION received:', data);

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
            title: 'Someone Liked You!',
            description: data.message || `${data.likerName} liked your profile`,
            variant: 'default',
          });
          // Invalidate likes queries to show new like
          queryClient.invalidateQueries({ queryKey: ['likes-received'] });
          queryClient.invalidateQueries({ queryKey: ['likes-stats'] });
          queryClient.invalidateQueries({ queryKey: ['tenant-dashboard'] });
          // Update stats in store
          fetchStats();
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
            title: "It's a Match!",
            description: data.message || `You matched with ${data.matchedUserName}!`,
            variant: 'default',
          });
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['likes-received'] });
          queryClient.invalidateQueries({ queryKey: ['likes-sent'] });
          queryClient.invalidateQueries({ queryKey: ['mutual-matches'] });
          queryClient.invalidateQueries({ queryKey: ['likes-stats'] });
          queryClient.invalidateQueries({ queryKey: ['tenant-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['matches'] });
          // Update stats in store
          fetchStats();
          break;

        default:
          console.log('Unknown notification type:', data.type);
      }
    };

    const handleUserStatus = (data) => {
      console.log('USER STATUS update:', data);
      // Invalidate queries that might show user online status
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    };

    const handleConnection = (data) => {
      console.log('CONNECTION event:', data);
      if (data.authenticated) {
        console.log('Socket authenticated as user:', data.userId);
      } else if (data.error) {
        console.warn('Socket authentication failed:', data.error);
      }
    };

    socket.on('notification', handleNotification);
    socket.on('user_status', handleUserStatus);
    socket.on('connection', handleConnection);
    listenersAttached.current = true;

    return () => {
      socket.off('notification', handleNotification);
      socket.off('user_status', handleUserStatus);
      socket.off('connection', handleConnection);
      listenersAttached.current = false;
    };
  }, [toast, queryClient, setMutualMatchData, fetchStats]);
}

export default useNotificationListener;
