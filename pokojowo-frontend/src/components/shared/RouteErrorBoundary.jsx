import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

/**
 * An error boundary that resets when the user navigates.
 *
 * A plain boundary holds its error until something remounts it, so a user who
 * hits a broken route stays on the fallback even after clicking elsewhere.
 * Keying on the path remounts it per navigation, which turns "the app is
 * broken" into "that one page is broken".
 */
export default function RouteErrorBoundary({ children, fullPage }) {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname} fullPage={fullPage}>
      {children}
    </ErrorBoundary>
  );
}
