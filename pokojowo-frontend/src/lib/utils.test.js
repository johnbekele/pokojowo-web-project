import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatDate } from './utils';

describe('formatDate', () => {
  let originalLanguage;

  beforeEach(() => {
    originalLanguage = localStorage.getItem('i18nextLng');
  });

  afterEach(() => {
    if (originalLanguage) localStorage.setItem('i18nextLng', originalLanguage);
    else localStorage.removeItem('i18nextLng');
  });

  it('formats dates in the active English locale', () => {
    localStorage.setItem('i18nextLng', 'en');

    expect(formatDate('2026-01-15T00:00:00Z', { timeZone: 'UTC' })).toBe('Jan 15, 2026');
  });

  it('formats dates in the active Polish locale', () => {
    localStorage.setItem('i18nextLng', 'pl');

    expect(formatDate('2026-01-15T00:00:00Z', { timeZone: 'UTC' })).toBe('15 sty 2026');
  });

  it('allows a view to format using its current i18next language', () => {
    localStorage.setItem('i18nextLng', 'en');

    expect(
      formatDate('2026-01-15T00:00:00Z', { timeZone: 'UTC' }, 'pl'),
    ).toBe('15 sty 2026');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});
