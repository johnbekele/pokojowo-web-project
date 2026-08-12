import { Button } from '@/components/ui/button';
import { ThemeToggleMobile } from '@/components/ui/theme-toggle';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function FloatingHeaderMobileFooter({
  isAuthenticated,
  i18n,
  t,
  onLogout,
  onNavigate,
}) {
  return (
    <div className="space-y-4 border-t border-border/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-eyebrow">{t('nav.theme', 'Theme')}</span>
        <ThemeToggleMobile />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-eyebrow">{t('nav.language', 'Language')}</span>
        <div className="flex overflow-hidden rounded-full border border-border">
          <button
            onClick={() => i18n.changeLanguage('en')}
            aria-label={t('actions.languageEnglish', 'Switch language to English')}
            className={cn(
              'px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
              i18n.language === 'en'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage('pl')}
            aria-label={t('actions.languagePolish', 'Switch language to Polish')}
            className={cn(
              'px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
              i18n.language === 'pl'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            PL
          </button>
        </div>
      </div>

      {isAuthenticated ? (
        <Button
          variant="outline"
          onClick={() => {
            onLogout();
            onNavigate();
          }}
          className="h-12 w-full justify-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {t('nav.logout', 'Sign out')}
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild className="h-12" onClick={onNavigate}>
            <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
          </Button>
          <Button asChild className="h-12" onClick={onNavigate}>
            <Link to="/signup">{t('nav.signUp', 'Join')}</Link>
          </Button>
        </div>
      )}

      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
