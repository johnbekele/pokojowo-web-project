/**
 * Build the { uri, name, type } file object that React Native's FormData expects
 * for multipart uploads, inferring a sensible filename + mime type from the URI.
 */
export function fileFromUri(uri: string) {
  const name = uri.split('/').pop() || `upload-${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(name);
  const ext = (match?.[1] || 'jpg').toLowerCase();
  const type =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { uri, name, type };
}

export default fileFromUri;
