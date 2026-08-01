/**
 * Single place a caught render error is handed off.
 *
 * There is no error tracker wired up yet (#166), so this only logs. Keeping the
 * call site in the error boundaries means adding one later is a change to this
 * file alone, rather than a hunt for every place that swallowed an error.
 */
export function reportError(error, context = {}) {
  console.error('[pokojowo] unhandled error', error, context);
}
