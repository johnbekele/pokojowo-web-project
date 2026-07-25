import { ReactNode } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import useTheme from '@/hooks/useTheme';

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
              <Text className="text-3xl font-extrabold text-brand text-center mb-6">Pokojowo</Text>
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
