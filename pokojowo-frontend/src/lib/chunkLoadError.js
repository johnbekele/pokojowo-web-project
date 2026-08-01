// Routes are lazy-loaded from hashed chunks, so a deploy invalidates the
// filenames a running tab already knows about. The next navigation in that tab
// throws while importing, and only a reload picks up the new manifest —
// re-rendering the same route will keep failing.
//
// The wording differs between browsers, hence the alternatives.
const CHUNK_LOAD_ERROR =
  /Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i;

export function isChunkLoadError(error) {
  return CHUNK_LOAD_ERROR.test(error?.message || '');
}
