/* global process */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
);

describe('Vercel edge routing', () => {
  it('sends API and chat traffic to the CloudFront services before the SPA fallback', () => {
    const rewrites = config.rewrites;
    const fallbackIndex = rewrites.findIndex(
      (rewrite) => rewrite.destination === '/index.html',
    );

    expect(fallbackIndex).toBeGreaterThan(-1);

    const expected = [
      ['/api/chat/:path*', 'https://dh3iw703m1vvi.cloudfront.net/api/chat/:path*'],
      ['/api/messages/:path*', 'https://dh3iw703m1vvi.cloudfront.net/api/messages/:path*'],
      ['/chat-socket.io/:path*', 'https://dh3iw703m1vvi.cloudfront.net/chat-socket.io/:path*'],
      ['/api/:path*', 'https://dh3iw703m1vvi.cloudfront.net/api/:path*'],
    ];

    expected.forEach(([source, destination], index) => {
      const rewrite = rewrites.find((candidate) => candidate.source === source);
      expect(rewrite, `missing rewrite for ${source}`).toEqual({ source, destination });
      expect(rewrites.indexOf(rewrite)).toBeLessThan(fallbackIndex);
      if (index > 0) {
        const previous = rewrites.findIndex(
          (candidate) => candidate.source === expected[index - 1][0],
        );
        expect(previous).toBeLessThan(rewrites.indexOf(rewrite));
      }
    });
  });

  it('does not leave an example host in the deployed configuration', () => {
    expect(JSON.stringify(config)).not.toContain('REPLACE_WITH_CLOUDFRONT_DOMAIN');
  });
});
