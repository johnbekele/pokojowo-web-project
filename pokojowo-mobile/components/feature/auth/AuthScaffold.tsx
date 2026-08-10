import { ReactNode } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import useTheme from '@/hooks/useTheme';
import { PokojowoMark } from '@/components/shared/brand';

interface AuthScaffoldProps {
  title?: string;
  subtitle?: string;
  showBrand?: boolean;
  onBack?: () => void;
  children: ReactNode;
}

/** Themed, keyboard-aware wrapper shared by all auth screens. */
export default function AuthScaffold({
  title,
  subtitle,
  showBrand = true,
  onBack,
  children,
}: AuthScaffoldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            className="px-4 pt-2 pb-1 flex-row items-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.back')}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 py-8">
            {showBrand && (
              <View className="items-center mb-6">
                <LinearGradient
                  colors={[colors.brand, colors.brand]}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PokojowoMark size={44} color={colors.brandFg} accent="rgba(255,255,255,0.35)" />
                </LinearGradient>
                <Text className="text-2xl font-extrabold text-brand text-center mt-3">Pokojowo</Text>
              </View>
            )}
            {title && <Text className="text-2xl font-bold text-text mb-1">{title}</Text>}
            {subtitle && <Text className="text-muted mb-6">{subtitle}</Text>}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
