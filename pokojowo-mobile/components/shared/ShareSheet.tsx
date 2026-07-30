import {
  Linking,
  Modal,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  X,
} from 'lucide-react-native';

import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Canonical URL to share (deep/universal link). */
  url: string;
  /** Short human message shown alongside the link. */
  message?: string;
  /** Title used for email subject / native sheet. */
  title?: string;
}

interface ShareTarget {
  key: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  /** Builds the platform URL. Return null to use the fallback handler. */
  build?: (ctx: { url: string; text: string; title: string }) => string;
  /** Custom action (copy, native sheet). Overrides `build`. */
  action?: (ctx: { url: string; text: string; title: string }) => Promise<void> | void;
}

/**
 * Social share bottom-sheet. Offers direct hand-off to popular apps (WhatsApp,
 * Telegram, Messenger, X, Facebook), plus email/SMS, copy-link, and the native
 * OS share sheet as a catch-all. Each app target degrades gracefully when the
 * app isn't installed.
 */
export default function ShareSheet({ visible, onClose, url, message, title }: ShareSheetProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);

  const text = message ? `${message}` : title || url;
  const fullText = `${text}\n${url}`;

  const openExternal = async (target: ShareTarget) => {
    if (target.action) {
      try {
        await target.action({ url, text, title: title || text });
      } catch {
        showToast({ type: 'error', message: t('share.failed', 'Could not share') });
      }
      return;
    }

    const link = target.build?.({ url, text, title: title || text });
    if (!link) return;

    // Attempt the hand-off directly. On Android 11+ `canOpenURL` gives false
    // negatives without manifest <queries>, so we open-and-catch instead: a
    // missing app throws, which we surface as a friendly toast.
    try {
      await Linking.openURL(link);
      onClose();
    } catch {
      showToast({
        type: 'error',
        message: t('share.appNotInstalled', 'That app is not installed'),
      });
    }
  };

  const targets: ShareTarget[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle size={24} color="#ffffff" />,
      bg: '#25D366',
      build: ({ text: tx, url: u }) => `whatsapp://send?text=${encodeURIComponent(`${tx}\n${u}`)}`,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <Send size={24} color="#ffffff" />,
      bg: '#229ED9',
      build: ({ text: tx, url: u }) =>
        `tg://msg_url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(tx)}`,
    },
    {
      key: 'messenger',
      label: 'Messenger',
      icon: <MessageCircle size={24} color="#ffffff" />,
      bg: '#0084FF',
      build: ({ url: u }) => `fb-messenger://share/?link=${encodeURIComponent(u)}`,
    },
    {
      key: 'twitter',
      label: 'X',
      icon: <Share2 size={24} color="#ffffff" />,
      bg: '#000000',
      build: ({ text: tx, url: u }) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(tx)}&url=${encodeURIComponent(u)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <Share2 size={24} color="#ffffff" />,
      bg: '#1877F2',
      build: ({ url: u }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    },
    {
      key: 'email',
      label: t('share.email', 'Email'),
      icon: <Mail size={24} color="#ffffff" />,
      bg: '#EA4335',
      build: ({ text: tx, url: u, title: ti }) =>
        `mailto:?subject=${encodeURIComponent(ti)}&body=${encodeURIComponent(`${tx}\n${u}`)}`,
    },
    {
      key: 'sms',
      label: t('share.sms', 'Messages'),
      icon: <MessageSquare size={24} color="#ffffff" />,
      bg: '#34C759',
      build: ({ text: tx, url: u }) => {
        const body = encodeURIComponent(`${tx}\n${u}`);
        return Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
      },
    },
    {
      key: 'copy',
      label: t('share.copyLink', 'Copy link'),
      icon: <LinkIcon size={24} color="#ffffff" />,
      bg: colors.muted,
      action: async ({ url: u }) => {
        // Lazy-load so a dev build without the native ExpoClipboard module
        // degrades to a toast instead of crashing the whole screen at import.
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(u);
        showToast({ type: 'success', message: t('share.copied', 'Link copied to clipboard') });
        onClose();
      },
    },
    {
      key: 'more',
      label: t('share.more', 'More'),
      icon: <Share2 size={24} color="#ffffff" />,
      bg: colors.brand,
      action: async ({ text: tx, url: u, title: ti }) => {
        await Share.share({ title: ti, message: `${tx}\n${u}` });
        onClose();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} className="bg-card rounded-t-3xl pb-8">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1.5 rounded-full bg-border" />
          </View>

          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className="text-lg font-bold text-text">{t('share.title', 'Share')}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap px-3 pb-2">
            {targets.map((target) => (
              <TouchableOpacity
                key={target.key}
                onPress={() => openExternal(target)}
                activeOpacity={0.7}
                className="items-center py-3"
                style={{ width: '25%' }}
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-1"
                  style={{ backgroundColor: target.bg }}
                >
                  {target.icon}
                </View>
                <Text className="text-xs text-text text-center" numberOfLines={1}>
                  {target.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
