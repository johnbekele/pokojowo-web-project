import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import useUIStore from '@/stores/uiStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

/** Renders the promise-based confirm dialog from uiStore. Mount once at root. */
export default function ConfirmHost() {
  const { t } = useTranslation('common');
  const confirmState = useUIStore((s) => s.confirmState);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);

  const { visible, options } = confirmState;

  return (
    <Modal
      visible={visible}
      onClose={() => resolveConfirm(false)}
      title={options.title}
      showCloseButton={false}
    >
      {options.message ? (
        <Text className="text-muted text-base mb-5">{options.message}</Text>
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button variant="outline" fullWidth onPress={() => resolveConfirm(false)}>
            {options.cancelLabel ?? t('actions.cancel')}
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant={options.destructive ? 'danger' : 'primary'}
            fullWidth
            onPress={() => resolveConfirm(true)}
          >
            {options.confirmLabel ?? t('actions.confirm')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
