import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageSquare, Search, Users, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getSocket, connectSocket } from '@/lib/socket';

export default function ChatList() {
  const { t } = useTranslation('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Listen for new messages and user status changes to update chat list in real-time
  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      // Refetch chat list when any new message arrives
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const handleUserStatus = (data) => {
      console.log('User status update in ChatList:', data);
      // Refetch chat list to update online status
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    const handleNotification = (data) => {
      // Also refetch on notification for new messages from other users
      if (data.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
    };

    const handleConnect = () => {
      // Refetch chats when socket reconnects
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_status', handleUserStatus);
    socket.on('notification', handleNotification);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_status', handleUserStatus);
      socket.off('notification', handleNotification);
      socket.off('connect', handleConnect);
    };
  }, [queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await api.get('/chat/');
      return response.data;
    },
    // No polling - socket events will trigger refetch via queryClient.invalidateQueries
  });

  const chats = data?.chats || data || [];

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const otherUser = chat.otherUser || chat.participants?.[0];
    if (!otherUser) return false;
    const fullName = `${otherUser.firstname} ${otherUser.lastname}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-52" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MessageSquare className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">{t('error.title')}</CardTitle>
          <CardDescription className="text-destructive/80">{t('error.loadFailed')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl"
        />
      </div>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardHeader className="text-center py-16">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">{t('empty.title')}</CardTitle>
            <CardDescription className="text-muted-foreground max-w-sm mx-auto mt-2">
              {t('empty.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <Link to="/matches">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                {t('empty.findMatches')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100dvh-14rem)] md:h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {filteredChats.map((chat) => (
              <ChatListItem key={chat._id || chat.id} chat={chat} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function ChatListItem({ chat }) {
  const { t } = useTranslation('chat');
  const otherUser = chat.otherUser || chat.participants?.[0];
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCount || 0;

  if (!otherUser) return null;

  return (
    <Link to={`/chat/${chat._id || chat.id}`}>
      <div
        className={cn(
          'group flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-md bg-card',
          unreadCount > 0
            ? 'border-primary/20 bg-primary/5'
            : 'border-border hover:border-primary/20'
        )}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <UserAvatar user={otherUser} size="lg" className="h-14 w-14" />
          {otherUser.isOnline && (
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={cn(
              'font-semibold truncate',
              unreadCount > 0 ? 'text-foreground' : 'text-foreground/80'
            )}>
              {otherUser.firstname} {otherUser.lastname}
            </p>
            {lastMessage?.createdAt && (
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {formatRelativeTime(lastMessage.createdAt)}
              </span>
            )}
          </div>
          {lastMessage ? (
            <p className={cn(
              'text-sm truncate',
              unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {lastMessage.content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t('noMessages')}
            </p>
          )}
        </div>

        {/* Badge & Arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <Badge className="h-6 min-w-[24px] rounded-full flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}
