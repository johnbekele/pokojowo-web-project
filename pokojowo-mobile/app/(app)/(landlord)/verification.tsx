import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, BadgeCheck, Clock, Upload, XCircle } from 'lucide-react-native';

import { Button } from '@/components/ui';
import api from '@/lib/api';
import { COLORS } from '@/lib/constants';

const DOC_TYPES = ['id_card', 'ownership_deed', 'utility_bill', 'business_registration'] as const;

const STATUS_ICONS: Record<string, React.ReactElement> = {
  pending: <Clock size={16} color="#eab308" />,
  approved: <BadgeCheck size={16} color="#22c55e" />,
  rejected: <XCircle size={16} color="#ef4444" />,
};

export default function LandlordVerificationScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>('id_card');

  const { data: status } = useQuery({
    queryKey: ['landlord', 'verification-status'],
    queryFn: async () => (await api.get('/verification/landlord/status')).data,
  });

  const uploadMutation = useMutation({
    mutationFn: async (asset: DocumentPicker.DocumentPickerAsset) => {
      const formData = new FormData();
      formData.append('type', docType);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'document.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      return (await api.post('/verification/landlord/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: () => {
      Alert.alert(t('verification.submitted', 'Document submitted for review'));
      queryClient.invalidateQueries({ queryKey: ['landlord', 'verification-status'] });
    },
    onError: (error: any) => {
      Alert.alert(
        t('verification.uploadFailed', 'Upload failed'),
        error?.response?.data?.detail || ''
      );
    },
  });

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      uploadMutation.mutate(result.assets[0]);
    }
  };

  const documents = status?.documents || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <ArrowLeft size={22} color={COLORS.gray[600]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {status?.isVerifiedLandlord
            ? t('verification.verifiedTitle', 'ID Verified landlord')
            : t('verification.title', 'Landlord verification')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-gray-500 mb-5">
          {t('verification.subtitle', 'Upload an ID and proof of ownership. An admin reviews your documents; verified landlords get a distinct badge on their listings.')}
        </Text>

        {documents.length > 0 && (
          <View className="gap-2 mb-6">
            {documents.map((doc: any) => (
              <View key={doc.id} className="flex-row items-center gap-2">
                {STATUS_ICONS[doc.status]}
                <Text className="font-medium text-gray-800">
                  {t(`verification.docTypes.${doc.type}`, { defaultValue: doc.type })}
                </Text>
                <Text className="text-gray-500 text-sm flex-1">
                  — {t(`verification.status.${doc.status}`, { defaultValue: doc.status })}
                  {doc.status === 'rejected' && doc.rejectionReason ? `: ${doc.rejectionReason}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!status?.isVerifiedLandlord && (
          <>
            <Text className="text-gray-700 font-medium mb-2">
              {t('verification.selectType', 'Document type')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {DOC_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setDocType(type)}
                  className={`px-4 py-2.5 rounded-lg border ${
                    docType === type ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={docType === type ? 'text-white font-medium' : 'text-gray-700'}>
                    {t(`verification.docTypes.${type}`, { defaultValue: type })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              variant="primary"
              onPress={pickAndUpload}
              disabled={uploadMutation.isPending}
            >
              <View className="flex-row items-center">
                <Upload size={16} color="white" />
                <Text className="text-white ml-2">
                  {t('verification.upload', 'Upload document')}
                </Text>
              </View>
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
