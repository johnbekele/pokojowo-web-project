import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Users, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import {
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  TrustBadge,
} from '@/components/shared/editorial';
import api from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getSocket, connectSocket } from '@/lib/socket';

export default function ChatList() {
  const { t } = useTranslation('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };
    const handleUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };
    const handleNotification = (data) => {
      if (data.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
    };
    const handleConnect = () => {
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
      <div className="space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
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
      <LuxuryPanel className="text-center py-16" tone="parchment">
        <Eyebrow>{t('error.eyebrow', 'Lost connection')}</Eyebrow>
        <h2 className="mt-3 font-display text-2xl font-medium text-foreground">
          {t('error.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('error.loadFailed')}</p>
      </LuxuryPanel>
    );
  }

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Eyebrow>{t('eyebrow', 'Correspondence')}</Eyebrow>
          <DisplayTitle size="md" italicWord={t('italic', 'in motion.')}>
            {t('title', 'Conversations,')}
          </DisplayTitle>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t(
              'subtitle',
              'A small, considered inbox. Replies that mean something, not a feed of pings.',
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TrustBadge tone="ink">{t('stats.threads', { count: chats.length, defaultValue: '{{count}} threads' })}</TrustBadge>
          {totalUnread > 0 && (
            <TrustBadge tone="rose">
              {t('stats.unread', { count: totalUnread, defaultValue: '{{count}} unread' })}
            </TrustBadge>
          )}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('search.placeholder', 'Search conversations…')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-full border-border/70 bg-card pl-12 text-sm placeholder:text-muted-foreground/70"
        />
      </div>

      <EditorialRule label={t('rule', 'Active threads')} />

      {filteredChats.length === 0 ? (
        <LuxuryPanel className="text-center py-16" tone="parchment">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-surface-paper text-muted-foreground">
            <MessageSquare className="h-6 w-6" />
          </span>
          <Eyebrow>{t('empty.eyebrow', 'No threads yet')}</Eyebrow>
          <h3 className="mt-3 font-display text-2xl font-medium text-foreground">
            {t('empty.title')}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t('empty.subtitle')}
          </p>
          <Link to="/matches" className="mt-6 inline-block">
            <Button>
              <Users className="h-4 w-4" />
              {t('empty.findMatches')}
            </Button>
          </Link>
        </LuxuryPanel>
      ) : (
        <ScrollArea className="h-[calc(100dvh-22rem)] md:h-[calc(100vh-360px)] -mx-2 px-2">
          <div className="space-y-2">
            {filteredChats.map((chat, idx) => (
              <ChatListItem key={chat._id || chat.id} chat={chat} index={idx} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function ChatListItem({ chat, index = 0 }) {
  const { t } = useTranslation('chat');
  const otherUser = chat.otherUser || chat.participants?.[0];
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCount || 0;

  if (!otherUser) return null;
  const hasUnread = unreadCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03 }}
    >
      <Link to={`/chat/${chat._id || chat.id}`}>
        <div
          className={cn(
            'group/thread flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-500',
            'hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-premium',
            hasUnread && 'border-accent/40 bg-accent/5',
          )}
        >
          <div className="relative flex-shrink-0">
            <UserAvatar user={otherUser} size="lg" className="h-14 w-14" />
            {otherUser.isOnline && (
              <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card bg-olive" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <p
                className={cn(
                  'truncate font-display text-base font-medium tracking-editorial text-foreground',
                  hasUnread && 'text-foreground',
                )}
              >
                {otherUser.firstname} {otherUser.lastname}
              </p>
              {lastMessage?.createdAt && (
                <span className="ml-3 flex-shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {formatRelativeTime(lastMessage.createdAt)}
                </span>
              )}
            </div>
            {lastMessage ? (
              <p
                className={cn(
                  'truncate text-sm leading-relaxed',
                  hasUnread ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {lastMessage.content}
              </p>
            ) : (
              <p className="truncate font-display text-sm italic text-muted-foreground">
                {t('noMessages', 'Open the conversation')}
              </p>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {hasUnread && (
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-foreground px-2 text-[11px] font-semibold text-background">
                {unreadCount}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors duration-300 group-hover/thread:text-foreground" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
