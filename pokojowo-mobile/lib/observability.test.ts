import { scrubEvent } from './observabilityPrivacy';

describe('observability privacy guard', () => {
  it('removes auth data, PII, and request bodies', () => {
    const scrubbed = scrubEvent({
      request: {
        headers: { Authorization: 'Bearer top-secret' },
        data: { email: 'person@example.com', phone: '+48 555 123 456' },
      },
      message: 'failed for person@example.com',
    }) as Record<string, any>;

    expect(scrubbed.request.headers.Authorization).toBe('[Filtered]');
    expect(scrubbed.request.data).toBe('[Filtered]');
    expect(JSON.stringify(scrubbed)).not.toContain('person@example.com');
    expect(JSON.stringify(scrubbed)).not.toContain('555 123 456');
    expect(JSON.stringify(scrubbed)).not.toContain('top-secret');
  });
});
