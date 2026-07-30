import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Flag, Ban, ShieldOff, X } from 'lucide-react-native';

import { useReportUser, useBlockUser, useUnblockUser } from '@/hooks/user/useUser';
import type { ReportReason } from '@/services/user.service';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';

interface UserActionsMenuProps {
  userId: string;
  /** Called after a successful block so the parent can navigate away. */
  onBlocked?: () => void;
}

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'scam',
  'harassment',
  'fake_profile',
  'inappropriate_content',
  'other',
];

/**
 * Kebab menu with report + block/unblock actions for another user's profile.
 * Backed by /users/{id}/report and /users/{id}/block.
 */
export default function UserActionsMenu({ userId, onBlocked }: UserActionsMenuProps) {
  const { t } = useTranslation(['profile', 'common']);
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const confirm = useUIStore((s) => s.confirm);
  const showToast = useUIStore((s) => s.showToast);

  const { mutate: reportUser, isPending: isReporting } = useReportUser();
  const { mutate: blockUser } = useBlockUser();
  const { mutate: unblockUser } = useUnblockUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isBlocked = !!user?.chat_settings?.blocked_users?.includes(userId);

  const handleReport = (reason: ReportReason) => {
    setReportOpen(false);
    reportUser(
      { userId, reason },
      {
        onSuccess: () =>
          showToast({
            type: 'success',
            message: t('profile:report.success', 'Report submitted. Our team will review it.'),
          }),
        onError: () =>
          showToast({
            type: 'error',
            message: t('profile:report.error', 'Failed to submit report'),
          }),
      }
    );
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: t('profile:block.title', 'Block user'),
      message: t('profile:block.confirm', 'They will no longer be able to message you or see you in matches.'),
      confirmLabel: t('profile:block.action', 'Block'),
      destructive: true,
    });
    if (!ok) return;
    blockUser(userId, {
      onSuccess: () => {
        showToast({ type: 'success', message: t('profile:block.blocked', 'User blocked') });
        onBlocked?.();
      },
      onError: () =>
        showToast({ type: 'error', message: t('profile:block.error', 'Failed to block user') }),
    });
  };

  const handleUnblock = () => {
    setMenuOpen(false);
    unblockUser(userId, {
      onSuccess: () =>
        showToast({ type: 'success', message: t('profile:block.unblocked', 'User unblocked') }),
      onError: () =>
        showToast({ type: 'error', message: t('profile:block.error', 'Failed to unblock user') }),
    });
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
        accessibilityLabel={t('profile:actions.more', 'More options')}
      >
        <MoreVertical size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Action sheet */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-card rounded-t-3xl p-4 pb-8">
            <View className="items-center mb-2">
              <View className="w-10 h-1.5 rounded-full bg-border" />
            </View>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              className="flex-row items-center py-4"
            >
              <Flag size={20} color={colors.text} />
              <Text className="ml-3 text-base text-text">
                {t('profile:report.action', 'Report user')}
              </Text>
            </TouchableOpacity>

            <View className="h-px bg-border" />

            <TouchableOpacity
              onPress={isBlocked ? handleUnblock : handleBlock}
              className="flex-row items-center py-4"
            >
              {isBlocked ? (
                <ShieldOff size={20} color={colors.text} />
              ) : (
                <Ban size={20} color={colors.danger} />
              )}
              <Text className={`ml-3 text-base ${isBlocked ? 'text-text' : 'text-danger'}`}>
                {isBlocked
                  ? t('profile:block.unblock', 'Unblock user')
                  : t('profile:block.action', 'Block user')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Report reason picker */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-card rounded-t-3xl p-4 pb-8">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-text">
                {t('profile:report.title', 'Report user')}
              </Text>
              <TouchableOpacity onPress={() => setReportOpen(false)} className="p-1">
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text className="text-muted text-sm mb-2">
              {t('profile:report.subtitle', 'Why are you reporting this user?')}
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                disabled={isReporting}
                onPress={() => handleReport(reason)}
                className="py-4 border-b border-border"
              >
                <Text className="text-base text-text">
                  {t(`profile:report.reasons.${reason}`, reason)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
