import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldX, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

function DocumentLink({ doc }) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  // Docs are private (not statically served) — fetch with auth, open blob
  const openDocument = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/verification/documents/${doc.id}/file`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={openDocument} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      {t(`admin.docTypes.${doc.type}`, doc.type)}
    </Button>
  );
}

export default function VerificationQueue() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectReasons, setRejectReasons] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'verification-queue'],
    queryFn: async () => (await api.get('/admin/verification-queue')).data,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ userId, action, reason }) => {
      const body = action === 'reject' ? { reason } : undefined;
      return (await api.post(`/admin/verification/${userId}/${action}`, body)).data;
    },
    onSuccess: (result) => {
      toast({ title: t(`admin.review.${result.message}`, result.message) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'verification-queue'] });
    },
    onError: (error) => {
      toast({
        title: t('admin.review.error', 'Review failed'),
        description: error.response?.data?.detail || '',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const queue = data?.queue || [];

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">
        {t('admin.verificationQueue.title', 'Landlord verification queue')}
      </h1>
      {queue.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {t('admin.verificationQueue.empty', 'No pending verifications.')}
        </p>
      ) : (
        queue.map((entry) => (
          <Card key={entry.user_id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {entry.firstname} {entry.lastname}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  @{entry.username} · {entry.email}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {entry.pendingDocuments.map((doc) => (
                  <DocumentLink key={doc.id} doc={doc} />
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="gap-2"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ userId: entry.user_id, action: 'approve' })}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {t('admin.review.approve', 'Approve')}
                </Button>
                <div className="flex flex-1 gap-2">
                  <Input
                    placeholder={t('admin.review.reasonPlaceholder', 'Rejection reason…')}
                    value={rejectReasons[entry.user_id] || ''}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({ ...prev, [entry.user_id]: e.target.value }))
                    }
                  />
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={reviewMutation.isPending || !(rejectReasons[entry.user_id] || '').trim()}
                    onClick={() =>
                      reviewMutation.mutate({
                        userId: entry.user_id,
                        action: 'reject',
                        reason: rejectReasons[entry.user_id],
                      })
                    }
                  >
                    <ShieldX className="h-4 w-4" />
                    {t('admin.review.reject', 'Reject')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
