/**
 * Tests for the Navbar auth rendering.
 *
 * Navbar decides what to show purely from localStorage (token + userData) and
 * listens for an `auth-change` event, so these tests seed localStorage and
 * assert on the rendered links - the same path a real sign-in takes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * Render the Navbar inside a router, because it calls useNavigate and Link.
 * @returns {import('@testing-library/react').RenderResult} render helpers
 */
const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

/**
 * Simulate a signed-in session by writing the two keys auth code reads.
 * @param {object} userData values stored under the userData key
 */
const signInAs = (userData) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('userData', JSON.stringify(userData));
};

describe('Navbar', () => {
  it('shows Login and Sign Up when no token is stored', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shows the username and Dashboard when a session exists', () => {
    signInAs({ username: 'clara_mends' });

    renderNavbar();

    expect(screen.getByText('clara_mends')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('shows the Admin link only for admin users', () => {
    signInAs({ username: 'admin_user', isAdmin: true });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('hides the Admin link for non-admin users', () => {
    signInAs({ username: 'clara_mends', isAdmin: false });

    renderNavbar();

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('clears the session and returns to signed-out links on Logout', async () => {
    const user = userEvent.setup();
    signInAs({ username: 'clara_mends' });

    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userData')).toBeNull();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });
});
