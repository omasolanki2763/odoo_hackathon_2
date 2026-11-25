import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * Render the Navbar inside a router, because it uses NavLink and useNavigate.
 * @returns {import('@testing-library/react').RenderResult} render helpers
 */
const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

/**
 * Simulate a signed-in session by writing the two keys the shell reads.
 * @param {object} userData values stored under the userData key
 */
const signInAs = (userData) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('userData', JSON.stringify(userData));
};

/**
 * Open the avatar dropdown so its menu items become queryable.
 * The trigger's accessible name is "<initial> <username>", so the username
 * identifies it without depending on the badge letter.
 * @param {string} username handle rendered inside the trigger
 * @returns {Promise<import('@testing-library/user-event').UserEvent>} user session
 */
const openAvatarMenu = async (username) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: new RegExp(username, 'i') }));
  return user;
};

describe('Navbar', () => {
  it('shows the guest actions when no token is stored', () => {
    renderNavbar();

    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Join' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the username and points balance when a session exists', () => {
    signInAs({ username: 'clara_mends', points: 120 });

    renderNavbar();

    expect(screen.getByText('clara_mends')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '120 points balance' })).toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: 'Sign in' })).toHaveLength(0);
  });

  it('falls back to a zero balance when points are missing', () => {
    signInAs({ username: 'clara_mends' });

    renderNavbar();

    expect(screen.getByRole('link', { name: '0 points balance' })).toBeInTheDocument();
  });

  it('opens the avatar menu with the signed-in actions', async () => {
    signInAs({ username: 'clara_mends' });

    renderNavbar();
    await openAvatarMenu('clara_mends');

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Swaps' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Admin Panel' })).not.toBeInTheDocument();
  });

  it('shows the Admin Panel entry only for admin users', async () => {
    signInAs({ username: 'owen_admin', isAdmin: true });

    renderNavbar();
    await openAvatarMenu('owen_admin');

    const adminItem = screen.getByRole('menuitem', { name: 'Admin Panel' });
    expect(adminItem).toBeInTheDocument();
    expect(adminItem).toHaveAttribute('href', '/admin');
  });

  it('clears the session and restores the guest actions on sign out', async () => {
    signInAs({ username: 'clara_mends' });

    renderNavbar();
    const user = await openAvatarMenu('clara_mends');
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userData')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
  });

  it('survives corrupt userData instead of crashing the shell', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userData', '{not-json');

    renderNavbar();

    // A bad payload must not blank the header; the shell falls back to "member".
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('toggles the mobile drawer from the menu button', async () => {
    const user = userEvent.setup();
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    const close = screen.getByRole('button', { name: 'Close navigation menu' });
    expect(close).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });
});
