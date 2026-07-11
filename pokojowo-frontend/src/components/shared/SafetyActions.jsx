import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

const REASONS = ['spam', 'scam', 'harassment', 'fake_profile', 'inappropriate_content', 'other'];

/**
 * Report + block controls for another user's profile/chat surfaces.
 * Small inline row; report opens a reason picker.
 */
export default function SafetyActions({ userId, onBlocked, className = '' }) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('spam');
  const [busy, setBusy] = useState(false);

  const report = async () => {
    setBusy(true);
    try {
      await api.post(`/users/${userId}/report`, { reason });
      toast({ title: t('safety.reported', 'Report submitted. Our team will review it.') });
      setReporting(false);
    } catch (error) {
      toast({
        title: t('safety.reportFailed', 'Could not submit the report'),
        description: error.response?.data?.detail || '',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    try {
      await api.post(`/users/${userId}/block`);
      toast({ title: t('safety.blocked', 'User blocked') });
      onBlocked?.();
    } catch (error) {
      toast({
        title: t('safety.blockFailed', 'Could not block the user'),
        description: error.response?.data?.detail || '',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {reporting ? (
        <>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`safety.reasons.${r}`, r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" onClick={report} disabled={busy} className="h-8">
            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t('safety.submitReport', 'Submit')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReporting(false)} className="h-8">
            {t('safety.cancel', 'Cancel')}
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReporting(true)}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Flag className="h-3.5 w-3.5" />
            {t('safety.report', 'Report')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={block}
            disabled={busy}
            className="h-8 gap-1 text-muted-foreground hover:text-destructive"
          >
            <Ban className="h-3.5 w-3.5" />
            {t('safety.block', 'Block')}
          </Button>
        </>
      )}
    </div>
  );
}
