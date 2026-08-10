import { render, screen, waitFor } from '@testing-library/react';
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

  it('restores a saved draft and its current step', async () => {
    localStorage.setItem(
      'pokojowo.draft.create-listing.new',
      JSON.stringify({
        version: 1,
        currentStep: 2,
        formData: {
          address: 'ul. Zachowana 10',
          city: '',
          district: '',
          coordinates: null,
          price: '2400',
          size: '42',
          maxTenants: 1,
          images: [],
          description: { en: '', pl: '' },
          availableFrom: '2026-01-01',
          roomType: 'Single',
          buildingType: 'Apartment',
          rentForOnly: ['Open to All'],
          canBeContacted: ['email', 'chat'],
          closeTo: [],
          AIHelp: false,
        },
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText('Step 2 of 5')).toBeVisible());
    expect(screen.getByLabelText(/Monthly Rent/)).toHaveValue(2400);
  });
});
