import { useCallback, useEffect } from 'react';

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave this page?';

/**
 * Protect long forms from accidental in-app navigation, tab closes and
 * refreshes. React Router's BrowserRouter does not expose useBlocker, so the
 * capture-phase link guard covers the same in-app paths while beforeunload
 * handles browser-level exits.
 */
export function useUnsavedChangesGuard(when, message = DEFAULT_MESSAGE) {
  const confirmNavigation = useCallback(
    () => !when || window.confirm(message),
    [message, when],
  );

  useEffect(() => {
    if (!when) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [message, when]);

  return confirmNavigation;
}
