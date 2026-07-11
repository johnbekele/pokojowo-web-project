import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';

/**
 * Sticky banner for users with an unverified email. Interactions
 * (like/message/create listing) are blocked server-side until verified.
 */
export default function VerifyEmailBanner() {
  const { t } = useTranslation('auth');
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  if (!user || user.isVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-verification-email', { email: user.email });
      toast({
        title: t('verifyBanner.sentTitle', 'Verification email sent'),
        description: t('verifyBanner.sentDescription', 'Check your inbox (and spam folder).'),
      });
    } catch (error) {
      if (error.response?.status === 429) {
        setCooldown(true);
        toast({
          title: t('verifyBanner.rateLimited', 'Too many attempts'),
          description: t('verifyBanner.rateLimitedHint', 'Please wait an hour before requesting another email.'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('verifyBanner.failed', 'Could not send the email'),
          description: error.response?.data?.detail || '',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300/60 px-4 py-2 text-sm text-amber-900 dark:text-amber-100">
      <span className="flex items-center gap-2">
        <MailWarning className="h-4 w-4 flex-shrink-0" />
        {t('verifyBanner.message', 'Verify your email to like, message and post listings.')}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={resend}
        disabled={sending || cooldown}
        className="h-7 border-amber-400 bg-transparent hover:bg-amber-200/60"
      >
        {sending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {cooldown
          ? t('verifyBanner.tryLater', 'Try again later')
          : t('verifyBanner.resend', 'Resend email')}
      </Button>
    </div>
  );
}
