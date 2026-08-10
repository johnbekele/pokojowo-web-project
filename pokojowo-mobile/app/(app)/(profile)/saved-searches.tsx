import { useCallback } from 'react';
import { FlatList, RefreshControl, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Bookmark, Bell, BellOff, Play, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, EmptyState, Header, LoadingSpinner, Button } from '@/components/ui';
import {
  useDeleteSavedSearch,
  useSavedSearches,
  useUpdateSavedSearch,
} from '@/hooks/saved-searches/useSavedSearches';
import type { SavedSearch } from '@/types/saved-search.types';
import { savedSearchSummary } from '@/types/saved-search.types';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';
import { formatRelativeTime } from '@/lib/utils';

export default function SavedSearchesScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { colors } = useTheme();
  const showToast = useUIStore((state) => state.showToast);
  const confirm = useUIStore((state) => state.confirm);
  const { data = [], isLoading, isError, isRefetching, refetch } = useSavedSearches();
  const updateSearch = useUpdateSavedSearch();
  const deleteSearch = useDeleteSavedSearch();

  const applySearch = useCallback((search: SavedSearch) => {
    router.push({ pathname: '/(app)/(home)', params: { savedSearch: search.id } } as never);
  }, [router]);

  const toggleNotifications = (search: SavedSearch) => {
    updateSearch.mutate(
      { id: search.id, data: { notifyEnabled: !search.notifyEnabled } },
      {
        onError: () => showToast({ type: 'error', message: t('savedSearches.updateError') }),
      },
    );
  };

  const removeSearch = async (search: SavedSearch) => {
    const ok = await confirm({
      title: t('savedSearches.deleteTitle'),
      message: t('savedSearches.deleteConfirm', { name: search.name }),
      confirmLabel: t('savedSearches.delete'),
      cancelLabel: t('actions.cancel', { ns: 'common' }),
      destructive: true,
    });
    if (!ok) return;

    deleteSearch.mutate(search.id, {
      onSuccess: () => showToast({ type: 'success', message: t('savedSearches.deleted') }),
      onError: () => showToast({ type: 'error', message: t('savedSearches.deleteError') }),
    });
  };

  const renderItem = ({ item }: { item: SavedSearch }) => {
    const summary = savedSearchSummary(item);
    return (
      <Card variant="elevated" padding="md" className="mx-4 mb-3">
        <View className="flex-row items-start">
          <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
            <Bookmark size={20} color={colors.brand} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-text" numberOfLines={1}>
              {item.name}
            </Text>
            {summary ? (
              <Text className="text-sm text-muted mt-1" numberOfLines={2}>
                {summary}
              </Text>
            ) : null}
            {item.search ? (
              <Text className="text-sm text-muted mt-1" numberOfLines={1}>
                “{item.search}”
              </Text>
            ) : null}
            <Text className="text-xs text-muted mt-2">
              {t('savedSearches.created', { time: formatRelativeTime(item.createdAt) })}
            </Text>
          </View>
          <Switch
            value={item.notifyEnabled}
            onValueChange={() => toggleNotifications(item)}
            trackColor={{ false: colors.border, true: colors.brand }}
            thumbColor={colors.card}
            accessibilityRole="switch"
            accessibilityLabel={t('savedSearches.notificationsLabel', { name: item.name })}
            accessibilityState={{ checked: item.notifyEnabled }}
          />
        </View>

        <View className="flex-row items-center gap-2 mt-4 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onPress={() => applySearch(item)}
            leftIcon={<Play size={16} color={colors.text} />}
          >
            {t('savedSearches.apply')}
          </Button>
          <TouchableOpacity
            onPress={() => removeSearch(item)}
            className="p-2 rounded-lg"
            accessibilityRole="button"
            accessibilityLabel={t('savedSearches.deleteLabel', { name: item.name })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={19} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center mt-2">
          {item.notifyEnabled ? <Bell size={14} color={colors.muted} /> : <BellOff size={14} color={colors.muted} />}
          <Text className="text-xs text-muted ml-1">
            {item.notifyEnabled ? t('savedSearches.notificationsOn') : t('savedSearches.notificationsOff')}
          </Text>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('savedSearches.loading')} />;
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('savedSearches.title')} showBack />
      {isError ? (
        <EmptyState
          icon={<Bookmark size={48} color={colors.muted} />}
          title={t('savedSearches.loadError')}
          action={{ label: t('actions.retry', { ns: 'common' }), onPress: () => refetch() }}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={48} color={colors.muted} />}
          title={t('savedSearches.empty.title')}
          description={t('savedSearches.empty.description')}
          action={{ label: t('savedSearches.empty.action'), onPress: () => router.push('/(app)/(home)') }}
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}
