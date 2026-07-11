import { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/ui';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';
import { COLORS } from '@/lib/constants';

export default function VerifyPhoneScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();

  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);

  const phoneVerified = (user as any)?.phoneVerified;

  const showError = (error: any, fallback: string) => {
    if (error?.response?.status === 429) {
      Alert.alert(
        t('phoneVerification.rateLimited', 'Too many attempts'),
        t('phoneVerification.rateLimitedHintShort', 'Please try again later.')
      );
    } else {
      Alert.alert(fallback, error?.response?.data?.detail || '');
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      await api.post('/verification/phone/start', { phone });
      setStage('code');
    } catch (error) {
      showError(error, t('phoneVerification.startFailed', 'Could not send the code'));
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      await api.post('/verification/phone/check', { code });
      await fetchUser();
      Alert.alert(
        t('phoneVerification.success', 'Phone verified!'),
        '',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      showError(error, t('phoneVerification.checkFailed', 'Incorrect code'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <ArrowLeft size={22} color={COLORS.gray[600]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {t('phoneVerification.title', 'Verify your phone')}
        </Text>
      </View>

      <View className="flex-1 px-4 pt-8 gap-4">
        {phoneVerified ? (
          <View className="items-center gap-3 pt-12">
            <ShieldCheck size={48} color="#22c55e" />
            <Text className="text-lg font-semibold text-gray-900">
              {t('phoneVerification.verifiedTitle', 'Phone verified')}
            </Text>
            <Text className="text-gray-500">{user?.phone}</Text>
          </View>
        ) : stage === 'phone' ? (
          <>
            <Text className="text-gray-500">
              {t('phoneVerification.subtitle', 'A verified phone number earns a trust badge and ranks you higher in matching.')}
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-4">
              <Phone size={18} color={COLORS.gray[400]} />
              <TextInput
                className="flex-1 ml-3 py-3 text-base"
                keyboardType="phone-pad"
                placeholder="+48 123 456 789"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <Button variant="primary" onPress={start} disabled={busy || !phone.trim()}>
              {t('phoneVerification.sendCode', 'Send code')}
            </Button>
          </>
        ) : (
          <>
            <Text className="text-gray-500">
              {t('phoneVerification.enterCode', 'Enter the 6-digit code we sent to {{phone}}.', { phone })}
            </Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-2xl text-center tracking-[8px] font-mono"
              keyboardType="number-pad"
              maxLength={8}
              placeholder="123456"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            />
            <Button variant="primary" onPress={check} disabled={busy || code.length < 4}>
              {t('phoneVerification.confirm', 'Confirm')}
            </Button>
            <Button variant="outline" onPress={() => setStage('phone')} disabled={busy}>
              {t('phoneVerification.changeNumber', 'Change number')}
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
