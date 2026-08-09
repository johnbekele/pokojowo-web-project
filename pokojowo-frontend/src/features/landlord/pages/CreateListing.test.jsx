import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));

vi.mock('@/components/shared/LocationPicker', () => ({
  default: () => <div data-testid="location-picker" />,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import CreateListing from './CreateListing';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateListing />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('create listing form', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires an address before moving past the location step', async () => {
    const user = userEvent.setup();
    renderPage();

    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText('Property Address *'), 'ul. Marszałkowska 10');
    expect(next).toBeEnabled();
    await user.click(next);
    expect(screen.getByText('Step 2 of 5')).toBeVisible();
  });

  it('requires rent and size before moving past the details step', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Property Address *'), 'ul. Marszałkowska 10');
    await user.click(screen.getByRole('button', { name: /next/i }));

    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
    await user.type(screen.getByLabelText(/Monthly Rent/), '2400');
    await user.type(screen.getByLabelText(/Size/), '42');
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByText('Step 3 of 5')).toBeVisible();
    expect(screen.getByText(/Property Photos/)).toBeVisible();
  });
});
