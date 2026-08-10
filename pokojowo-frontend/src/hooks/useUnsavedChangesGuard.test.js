import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useUnsavedChangesGuard', () => {
  it('blocks same-origin link navigation when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => useUnsavedChangesGuard(true, 'Leave?'));

    const link = document.createElement('a');
    link.href = '/dashboard';
    link.addEventListener('click', (event) => event.preventDefault());
    document.body.appendChild(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith('Leave?');
  });

  it('allows navigation and browser unload when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useUnsavedChangesGuard(true, 'Leave?'));

    const link = document.createElement('a');
    link.href = '#keep';
    document.body.appendChild(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });
});
