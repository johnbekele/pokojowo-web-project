import { afterEach, describe, expect, it } from 'vitest';

import { clearFormDraft, readFormDraft, writeFormDraft } from './formDraft';

afterEach(() => localStorage.clear());

describe('form draft persistence', () => {
  it('round-trips form data and the current step', () => {
    writeFormDraft('draft:test', { address: 'ul. Testowa 1' }, 3);

    expect(readFormDraft('draft:test')).toMatchObject({
      formData: { address: 'ul. Testowa 1' },
      currentStep: 3,
      version: 1,
    });
  });

  it('ignores malformed or unknown draft versions', () => {
    localStorage.setItem('draft:test', '{not-json');
    expect(readFormDraft('draft:test')).toBeNull();

    localStorage.setItem('draft:test', JSON.stringify({ version: 99, formData: {} }));
    expect(readFormDraft('draft:test')).toBeNull();
  });

  it('clears a draft after a successful submission', () => {
    writeFormDraft('draft:test', { address: 'ul. Testowa 1' }, 1);
    clearFormDraft('draft:test');
    expect(readFormDraft('draft:test')).toBeNull();
  });
});
