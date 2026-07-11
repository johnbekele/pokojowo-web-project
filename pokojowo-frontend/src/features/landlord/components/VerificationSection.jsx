import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Clock, Upload, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

const DOC_TYPES = ['id_card', 'ownership_deed', 'utility_bill', 'business_registration'];

const STATUS_ICON = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <BadgeCheck className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

export default function VerificationSection() {
  const { t } = useTranslation('profile');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [docType, setDocType] = useState('id_card');

  const { data: status } = useQuery({
    queryKey: ['landlord', 'verification-status'],
    queryFn: async () => (await api.get('/verification/landlord/status')).data,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('type', docType);
      formData.append('file', file);
      return (await api.post('/verification/landlord/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: () => {
      toast({ title: t('verification.submitted', 'Document submitted for review') });
      queryClient.invalidateQueries({ queryKey: ['landlord', 'verification-status'] });
    },
    onError: (error) => {
      toast({
        title: t('verification.uploadFailed', 'Upload failed'),
        description: error.response?.data?.detail || '',
        variant: 'destructive',
      });
    },
  });

  const documents = status?.documents || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.isVerifiedLandlord ? (
            <>
              <BadgeCheck className="h-5 w-5 text-green-500" />
              {t('verification.verifiedTitle', 'ID Verified landlord')}
            </>
          ) : (
            t('verification.title', 'Landlord verification')
          )}
        </CardTitle>
        <CardDescription>
          {t(
            'verification.subtitle',
            'Upload an ID and proof of ownership. An admin reviews your documents; verified landlords get a distinct badge on their listings.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 text-sm">
                {STATUS_ICON[doc.status]}
                <span className="font-medium">{t(`verification.docTypes.${doc.type}`, doc.type)}</span>
                <span className="text-muted-foreground">
                  — {t(`verification.status.${doc.status}`, doc.status)}
                  {doc.status === 'rejected' && doc.rejectionReason ? `: ${doc.rejectionReason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!status?.isVerifiedLandlord && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`verification.docTypes.${type}`, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = '';
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="gap-2"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t('verification.upload', 'Upload document')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
