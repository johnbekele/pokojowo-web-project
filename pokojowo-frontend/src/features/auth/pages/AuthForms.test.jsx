import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const authState = {
  login: vi.fn(),
  register: vi.fn(),
  loginWithGoogle: vi.fn(),
  isLoading: false,
  error: null,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('@/stores/authStore', () => ({
  default: () => authState,
}));

import Login from './Login';
import Signup from './Signup';

function renderPage(page) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('authentication forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoading = false;
    authState.error = null;
  });

  it('shows login validation errors before making an API request', async () => {
    const user = userEvent.setup();
    renderPage(<Login />);

    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    expect(await screen.findByText('Please enter a valid email')).toBeVisible();
    expect(await screen.findByText('Password is required')).toBeVisible();
    expect(authState.login).not.toHaveBeenCalled();
  });

  it('submits valid login credentials to the auth store', async () => {
    const user = userEvent.setup();
    authState.login.mockResolvedValueOnce({
      success: true,
      user: { role: ['Tenant'], isProfileComplete: true },
    });
    renderPage(<Login />);

    await user.type(screen.getByLabelText('login.email'), 'tenant@example.com');
    await user.type(screen.getByLabelText('login.password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    expect(authState.login).toHaveBeenCalledWith('tenant@example.com', 'correct-password');
  });

  it('validates signup password policy and confirmation', async () => {
    const user = userEvent.setup();
    renderPage(<Signup />);

    await user.type(screen.getByLabelText('signup.username'), 'ab');
    await user.type(screen.getByLabelText('signup.email'), 'not-an-email');
    await user.type(screen.getByLabelText('signup.password'), 'short');
    await user.type(screen.getByLabelText('signup.confirmPassword'), 'different');
    await user.click(screen.getByRole('button', { name: 'signup.submit' }));

    expect(await screen.findByText('Username must be at least 3 characters')).toBeVisible();
    expect(await screen.findByText('Please enter a valid email')).toBeVisible();
    expect(await screen.findByText('Password must be at least 10 characters')).toBeVisible();
    expect(await screen.findByText("Passwords don't match")).toBeVisible();
    expect(authState.register).not.toHaveBeenCalled();
  });

  it('rejects passwords containing the username or email local part', async () => {
    const user = userEvent.setup();
    renderPage(<Signup />);

    await user.type(screen.getByLabelText('signup.username'), 'janek');
    await user.type(screen.getByLabelText('signup.email'), 'janek@example.com');
    await user.type(screen.getByLabelText('signup.password'), 'janek-secure-password');
    await user.type(screen.getByLabelText('signup.confirmPassword'), 'janek-secure-password');
    await user.click(screen.getByRole('button', { name: 'signup.submit' }));

    expect(
      await screen.findByText('Password must not contain your username or email address')
    ).toBeVisible();
    expect(authState.register).not.toHaveBeenCalled();
  });
});
