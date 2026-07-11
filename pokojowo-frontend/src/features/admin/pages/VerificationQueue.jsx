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

  const { data: reportsData } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => (await api.get('/admin/reports')).data,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, outcome }) =>
      (await api.post(`/admin/reports/${reportId}/resolve`, { outcome })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  const banMutation = useMutation({
    mutationFn: async (userId) => (await api.post(`/admin/users/${userId}/ban`)).data,
    onSuccess: () => {
      toast({ title: t('admin.reports.banned', 'User banned') });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
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
  const reports = reportsData?.reports || [];

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

      <h2 className="text-2xl font-bold pt-6">
        {t('admin.reports.title', 'Open reports')}
      </h2>
      {reports.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center">
          {t('admin.reports.empty', 'No open reports.')}
        </p>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm">
                <span className="font-semibold">@{report.reporter?.username}</span>{' '}
                {t('admin.reports.reportedLabel', 'reported')}{' '}
                <span className="font-semibold">@{report.reported?.username}</span>{' '}
                — <span className="uppercase text-xs tracking-wide">{report.reason}</span>
              </p>
              {report.details && (
                <p className="text-sm text-muted-foreground">"{report.details}"</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate({ reportId: report.id, outcome: 'resolved' })}
                >
                  {t('admin.reports.resolve', 'Resolve')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveMutation.mutate({ reportId: report.id, outcome: 'dismissed' })}
                >
                  {t('admin.reports.dismiss', 'Dismiss')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={report.reported?.isActive === false}
                  onClick={() => banMutation.mutate(report.reported.user_id)}
                >
                  {report.reported?.isActive === false
                    ? t('admin.reports.alreadyBanned', 'Banned')
                    : t('admin.reports.ban', 'Ban user')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
