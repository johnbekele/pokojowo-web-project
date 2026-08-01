import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { isChunkLoadError } from '@/lib/chunkLoadError';

/**
 * What an ErrorBoundary shows in place of the subtree that failed.
 *
 * A stale build gets its own wording, because retrying the same render cannot
 * fix a chunk that no longer exists on the server — only a reload can.
 */
export default function ErrorFallback({ error, fullPage, onRetry }) {
  const { t } = useTranslation('common');
  const staleBuild = isChunkLoadError(error);

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-4 p-8 text-center ${
        fullPage ? 'min-h-screen' : 'min-h-[400px]'
      }`}
    >
      {staleBuild ? (
        <RefreshCw className="h-12 w-12 text-muted-foreground" />
      ) : (
        <AlertTriangle className="h-12 w-12 text-destructive" />
      )}

      <h2 className="text-xl font-semibold">
        {staleBuild
          ? t('errors.staleBuildTitle', 'A new version is available')
          : t('errors.boundaryTitle', 'Something went wrong')}
      </h2>

      <p className="text-muted-foreground max-w-md">
        {staleBuild
          ? t('errors.staleBuildBody', 'Reload the page to pick up the latest version.')
          : t(
              'errors.boundaryBody',
              'This part of the page failed to load. You can try again, or head back home.'
            )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Retrying re-renders the subtree, which is worth a try for a
            transient failure but cannot help a chunk that is gone. */}
        {!staleBuild && <Button onClick={onRetry}>{t('actions.retry', 'Retry')}</Button>}

        <Button
          variant={staleBuild ? 'default' : 'outline'}
          onClick={() => window.location.reload()}
        >
          {t('errors.reload', 'Reload page')}
        </Button>
      </div>

      {/* A full navigation rather than a router link: the router may be part of
          what failed, and this has to work regardless. */}
      <a href="/" className="text-sm text-muted-foreground underline hover:text-foreground">
        {t('errors.goHome', 'Go home')}
      </a>
    </div>
  );
}
