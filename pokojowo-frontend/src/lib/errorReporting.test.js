import { describe, expect, it } from 'vitest';
import { scrubEvent, sentryEnabled } from './errorReporting';

describe('error reporting privacy guard', () => {
  it('removes credentials, PII, and request bodies before capture', () => {
    const scrubbed = scrubEvent({
      request: {
        headers: { Authorization: 'Bearer top-secret' },
        data: { email: 'person@example.com', password: 'hunter2' },
        url: 'https://example.test/login?phone=+48 555 123 456',
      },
      message: 'failed for person@example.com',
    });

    expect(scrubbed.request.headers.Authorization).toBe('[Filtered]');
    expect(scrubbed.request.data).toBe('[Filtered]');
    expect(JSON.stringify(scrubbed)).not.toContain('person@example.com');
    expect(JSON.stringify(scrubbed)).not.toContain('555 123 456');
    expect(JSON.stringify(scrubbed)).not.toContain('top-secret');
  });

  it('stays disabled when no public DSN is configured', () => {
    expect(sentryEnabled).toBe(false);
  });
});
