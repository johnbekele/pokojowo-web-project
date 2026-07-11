import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';

/**
 * Phone verification flow: enter number -> receive SMS code -> confirm.
 * Server enforces rate limits (3 sends/hour, 5 checks/hour).
 */
export default function PhoneVerificationCard() {
  const { t } = useTranslation('profile');
  const { toast } = useToast();
  const { user, fetchUser } = useAuthStore();

  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('idle'); // idle | code
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  if (user.phoneVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            {t('phoneVerification.verifiedTitle', 'Phone verified')}
          </CardTitle>
          <CardDescription>{user.phone}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleError = (error, fallback) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 60;
      toast({
        title: t('phoneVerification.rateLimited', 'Too many attempts'),
        description: t('phoneVerification.rateLimitedHint', 'Try again in about {{minutes}} minutes.', { minutes }),
        variant: 'destructive',
      });
    } else {
      toast({
        title: fallback,
        description: error.response?.data?.detail || '',
        variant: 'destructive',
      });
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      await api.post('/verification/phone/start', { phone });
      setStage('code');
      toast({ title: t('phoneVerification.codeSent', 'Verification code sent by SMS') });
    } catch (error) {
      handleError(error, t('phoneVerification.startFailed', 'Could not send the code'));
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      await api.post('/verification/phone/check', { code });
      toast({ title: t('phoneVerification.success', 'Phone verified!') });
      await fetchUser();
    } catch (error) {
      handleError(error, t('phoneVerification.checkFailed', 'Incorrect code'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5" />
          {t('phoneVerification.title', 'Verify your phone')}
        </CardTitle>
        <CardDescription>
          {t('phoneVerification.subtitle', 'A verified phone number earns a trust badge and ranks you higher in matching.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stage === 'idle' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="tel"
              placeholder="+48 123 456 789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button onClick={start} disabled={busy || !phone.trim()} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('phoneVerification.sendCode', 'Send code')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="sm:max-w-[10rem] text-center tracking-[0.4em] font-mono"
            />
            <Button onClick={check} disabled={busy || code.length < 4} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('phoneVerification.confirm', 'Confirm')}
            </Button>
            <Button variant="ghost" onClick={() => setStage('idle')} disabled={busy}>
              {t('phoneVerification.changeNumber', 'Change number')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
