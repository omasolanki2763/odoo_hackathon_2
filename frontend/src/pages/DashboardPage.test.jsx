import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import DashboardPage from './DashboardPage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const renderDashboard = (initialEntry = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/points" element={<div>Points Route</div>} />
        <Route path="/items/:id" element={<div>Item Route</div>} />
        <Route path="/items" element={<div>Catalogue Route</div>} />
        <Route path="/add-item" element={<div>Add Item Route</div>} />
        <Route path="/swaps/:id" element={<div>Swap Detail Route</div>} />
        <Route path="/swaps" element={<div>Swaps Route</div>} />
        <Route path="/members/:username" element={<div>Member Profile Route</div>} />
        <Route path="/login" element={<div>Login Route</div>} />
      </Routes>
    </MemoryRouter>
  );

const FULL_DASHBOARD_PAYLOAD = {
  user: {
    _id: 'user-clara',
    username: 'clara_mends',
    points: 340,
    createdAt: '2025-03-01T00:00:00.000Z',
  },
  stats: {
    itemsCount: 6,
    swapsCompleted: 4,
    itemsReceived: 4,
    totalSwapsCount: 4,
    earnedPoints: 400,
    spentPoints: 60,
  },
  trust: {
    averageStars: 4.8,
    ratingCount: 10,
    matchedCount: 9,
  },
  myItems: [
    { _id: 'item-p', title: 'Chore Coat', category: 'outerwear', size: 'L', pointsValue: 75, status: 'pending' },
    { _id: 'item-a', title: 'Wool Knit', category: 'tops', size: 'M', pointsValue: 60, status: 'available' },
    { _id: 'item-r', title: 'Silk Scarf', category: 'accessories', size: 'One Size', pointsValue: 30, status: 'reserved' },
    { _id: 'item-s', title: 'Selvedge Jeans', category: 'bottoms', size: '32', pointsValue: 65, status: 'swapped' },
    { _id: 'item-d', title: 'Oxford Shirt', category: 'tops', size: 'M', pointsValue: 50, status: 'redeemed' },
    { _id: 'item-x', title: 'Torn Jacket', category: 'outerwear', size: 'M', pointsValue: 40, status: 'rejected' },
  ],
  recentTransactions: [
    { _id: 'tx-1', type: 'received', amount: 60, description: 'Swap completed', createdAt: '2026-11-24T10:00:00.000Z' },
  ],
  swapsNeedingAction: [
    {
      _id: 'swap-incoming-1',
      type: 'swap',
      status: 'pending',
      pointsOffered: 0,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      requesterId: { _id: 'u-mia', username: 'mia_rewears' },
      itemOwnerId: { _id: 'user-clara', username: 'clara_mends' },
      itemId: { _id: 'item-a', title: 'Wool Knit' },
      requestedItemId: { _id: 'item-m1', title: 'Pleated Skirt' },
    },
  ],
  openRequests: [
    {
      _id: 'swap-open-1',
      type: 'swap',
      status: 'pending',
      pointsOffered: 0,
      expiresAt: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
      requesterId: { _id: 'user-clara', username: 'clara_mends' },
      itemOwnerId: { _id: 'u-noor', username: 'noor_vintage' },
      itemId: { _id: 'item-n1', title: 'Linen Trench Coat' },
      requestedItemId: { _id: 'item-p', title: 'Chore Coat' },
    },
  ],
  acceptedSwaps: [],
  completedSwaps: [
    {
      _id: 'swap-done-unrated',
      type: 'redeem',
      status: 'completed',
      pointsOffered: 50,
      hasRated: false,
      completedAt: '2026-11-23T12:00:00.000Z',
      requesterId: { _id: 'user-clara', username: 'clara_mends' },
      itemOwnerId: { _id: 'u-tomas', username: 'tomas_finds' },
      itemId: { _id: 'item-t1', title: 'Heavyweight Tee' },
    },
    {
      _id: 'swap-done-rated',
      type: 'swap',
      status: 'completed',
      pointsOffered: 0,
      hasRated: true,
      completedAt: '2026-11-20T12:00:00.000Z',
      requesterId: { _id: 'user-clara', username: 'clara_mends' },
      itemOwnerId: { _id: 'u-mia', username: 'mia_rewears' },
      itemId: { _id: 'item-s', title: 'Selvedge Jeans' },
    },
  ],
};

describe('DashboardPage (editorial dashboard + welcome state)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-clara', username: 'clara_mends', points: 340 }));
  });

  it('renders the welcome empty state for a new member with 100 starter points and three first steps', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { _id: 'user-new', username: 'nora_leaf', points: 100, createdAt: '2026-11-27T08:00:00.000Z' },
          stats: { itemsCount: 0, swapsCompleted: 0, itemsReceived: 0, totalSwapsCount: 0, earnedPoints: 100, spentPoints: 0 },
          trust: { averageStars: 0, ratingCount: 0, matchedCount: 0 },
          myItems: [],
          swapsNeedingAction: [],
          openRequests: [],
          acceptedSwaps: [],
          completedSwaps: [],
          recentTransactions: [],
        },
      },
    });

    renderDashboard('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Welcome, @nora_leaf' })).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Points history/i })).toHaveAttribute('href', '/points');
    expect(screen.getByRole('heading', { name: 'Your rack is empty.' })).toBeInTheDocument();
    expect(screen.getByText(/Every new member starts with/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'List an item' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Browse the catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How points work' })).toBeInTheDocument();
    expect(screen.getByText('No swap requests yet.')).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('renders full state with greeting, points link, all rack statuses, trust summary, open countdown, and rate prompts', async () => {
    api.get.mockResolvedValue({
      data: { success: true, data: FULL_DASHBOARD_PAYLOAD },
    });

    renderDashboard('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Welcome back, @clara_mends' })).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Points history/i })).toHaveAttribute('href', '/points');

    // Rack status badges & item links
    expect(screen.getByRole('link', { name: 'Chore Coat' })).toHaveAttribute('href', '/items/item-p');
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText('Swapped')).toBeInTheDocument();
    expect(screen.getByText('Redeemed')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Trust summary
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('from 10 ratings')).toBeInTheDocument();
    expect(screen.getByText('9 of 10 swaps matched their listing')).toBeInTheDocument();

    // Open requests expiry countdown & completed swap rate prompt
    const openSection = screen.getByRole('region', { name: 'My open requests' });
    expect(within(openSection).getByText(/1d 2h left to expire|1d 3h left to expire/i)).toBeInTheDocument();

    const completedSection = screen.getByRole('region', { name: 'Recently completed swaps' });
    const rateLink = within(completedSection).getByRole('link', { name: 'Rate this swap' });
    expect(rateLink).toHaveAttribute('href', '/swaps/swap-done-unrated');
    expect(within(completedSection).getByText('Rated')).toBeInTheDocument();
  });

  it('supports Accept and Decline action shortcuts in Swaps needing my action', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/auth/dashboard') {
        return Promise.resolve({ data: { success: true, data: FULL_DASHBOARD_PAYLOAD } });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: FULL_DASHBOARD_PAYLOAD.user } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    api.put.mockResolvedValue({ data: { success: true, data: {} } });

    const user = userEvent.setup();
    renderDashboard('/dashboard');

    const actionSection = await screen.findByRole('region', { name: 'Swaps needing my action' });
    expect(within(actionSection).getByText('@mia_rewears')).toBeInTheDocument();
    expect(within(actionSection).getByRole('link', { name: /View swap/i })).toHaveAttribute(
      'href',
      '/swaps/swap-incoming-1'
    );

    await user.click(within(actionSection).getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/swaps/swap-incoming-1/accept');
    });
    expect(await screen.findByText(/Swap accepted/i)).toBeInTheDocument();

    await user.click(within(actionSection).getByRole('button', { name: 'Decline' }));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/swaps/swap-incoming-1/reject');
    });
  });
});
