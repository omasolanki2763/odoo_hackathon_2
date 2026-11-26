import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import api from '../api';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Auth pages (LoginPage & RegisterPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows inline validation errors with aria-describedby on invalid LoginPage submit', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error');
    expect(passwordInput).toHaveAttribute('aria-describedby', 'login-password-error');
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();
  });

  it('toggles password visibility, disables submit while pending, and shows role=alert on server error', async () => {
    const user = userEvent.setup();
    let rejectLogin;
    api.post.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectLogin = reject;
      })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.type(screen.getByLabelText('Email'), 'clara@rewear.community');
    await user.type(passwordInput, 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    const pendingBtn = screen.getByRole('button', { name: 'Signing In...' });
    expect(pendingBtn).toBeDisabled();

    rejectLogin({
      response: { data: { message: 'Invalid email or password' } },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('registers a user, signs them in, dispatches auth-change, and redirects to /dashboard?welcome=1', async () => {
    const user = userEvent.setup();
    const authListener = vi.fn();
    window.addEventListener('auth-change', authListener);

    api.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'test-register-token',
          user: {
            _id: 'u-1',
            username: 'clara_mends',
            email: 'clara@rewear.community',
            points: 100,
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<div>Dashboard Welcome Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('USERNAME'), 'clara_mends');
    await user.type(screen.getByLabelText('EMAIL ADDRESS'), 'clara@rewear.community');
    await user.type(screen.getByLabelText('PASSWORD'), 'Password1');
    await user.type(screen.getByLabelText('CONFIRM PASSWORD'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Welcome Screen')).toBeInTheDocument();
    });
    expect(localStorage.getItem('token')).toBe('test-register-token');
    expect(authListener).toHaveBeenCalled();

    window.removeEventListener('auth-change', authListener);
  });
});
