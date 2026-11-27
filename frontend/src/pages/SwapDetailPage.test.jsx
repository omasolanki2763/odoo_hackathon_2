import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import SwapDetailPage from './SwapDetailPage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const BASE_SWAP = {
  _id: 'swap-101',
  type: 'swap',
  status: 'pending',
  pointsOffered: 15,
  handoverMethod: 'in_person',
  handoverNote: 'Outside Indiranagar metro gate 2',
  message: 'Saturday morning works well',
  expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: '2026-11-24T10:00:00.000Z',
  requesterId: {
    _id: 'user-req',
    username: 'clara_mends',
    createdAt: '2025-01-10T00:00:00.000Z',
  },
  itemOwnerId: {
    _id: 'user-owner',
    username: 'mia_rewears',
    createdAt: '2025-02-01T00:00:00.000Z',
  },
  itemId: {
    _id: 'item-owner',
    title: 'Vintage Denim Chore Jacket',
    size: 'L',
    condition: 'good',
    category: 'outerwear',
    pointsValue: 75,
    images: [],
  },
  requestedItemId: {
    _id: 'item-req',
    title: 'Fisherman Wool Ribbed Knit',
    size: 'M',
    condition: 'like-new',
    category: 'tops',
    pointsValue: 60,
    images: [],
  },
  timeline: [
    {
      action: 'Swap request created',
      date: '2026-11-24T10:00:00.000Z',
      details: 'Requested swap',
    },
  ],
  transactions: [
    {
      _id: 'tx-1',
      type: 'hold',
      amount: 15,
      description: 'Points held for swap request: Vintage Denim Chore Jacket',
      createdAt: '2026-11-24T10:00:01.000Z',
    },
  ],
};

const renderSwapDetail = () =>
  render(
    <MemoryRouter initialEntries={['/swaps/swap-101']}>
      <Routes>
        <Route path="/swaps/:id" element={<SwapDetailPage />} />
        <Route path="/swaps" element={<div>Swaps List Route</div>} />
        <Route path="/dashboard" element={<div>Dashboard Route</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('SwapDetailPage role and state actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows Accept and Decline with optional reason for item owner on pending swap and syncs points after decline', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-owner', username: 'mia_rewears', points: 100 }));
    let declined = false;

    api.get.mockImplementation((url) => {
      if (url === '/swaps/swap-101') {
        return Promise.resolve({
          data: {
            success: true,
            data: declined
              ? {
                  ...BASE_SWAP,
                  status: 'rejected',
                  response: { message: 'Sized too small for me' },
                  transactions: [
                    ...BASE_SWAP.transactions,
                    {
                      _id: 'tx-2',
                      type: 'refund',
                      amount: 15,
                      description: 'Refund for declined swap request',
                      createdAt: '2026-11-24T11:00:00.000Z',
                    },
                  ],
                }
              : BASE_SWAP,
          },
        });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: { _id: 'user-owner', username: 'mia_rewears', points: 100 } } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.put.mockImplementation((url) => {
      if (url === '/swaps/swap-101/reject') {
        declined = true;
        return Promise.resolve({ data: { success: true, data: { ...BASE_SWAP, status: 'rejected' } } });
      }
      return Promise.reject(new Error(`Unexpected PUT ${url}`));
    });

    const user = userEvent.setup();
    renderSwapDetail();

    expect(await screen.findByRole('button', { name: /accept swap/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline swap/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark as completed/i })).not.toBeInTheDocument();
    expect(screen.getByText(/expires in/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /decline swap/i }));
    const reasonField = await screen.findByLabelText(/reason for declining/i);
    await user.type(reasonField, 'Sized too small for me');
    await user.click(screen.getByRole('button', { name: /confirm decline/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/swaps/swap-101/reject', {
        reason: 'Sized too small for me',
      });
    });

    expect(await screen.findByText('Declined')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept swap/i })).not.toBeInTheDocument();
  });

  it('shows Cancel request only for requester on pending swap and calls cancel endpoint', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-req', username: 'clara_mends', points: 235 }));
    let cancelled = false;

    api.get.mockImplementation((url) => {
      if (url === '/swaps/swap-101') {
        return Promise.resolve({
          data: {
            success: true,
            data: cancelled ? { ...BASE_SWAP, status: 'cancelled' } : BASE_SWAP,
          },
        });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: { _id: 'user-req', username: 'clara_mends', points: 250 } } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.put.mockImplementation((url) => {
      if (url === '/swaps/swap-101/cancel') {
        cancelled = true;
        return Promise.resolve({ data: { success: true, data: { ...BASE_SWAP, status: 'cancelled' } } });
      }
      return Promise.reject(new Error(`Unexpected PUT ${url}`));
    });

    const user = userEvent.setup();
    renderSwapDetail();

    const cancelBtn = await screen.findByRole('button', { name: /cancel request/i });
    expect(screen.queryByRole('button', { name: /accept swap/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline swap/i })).not.toBeInTheDocument();

    await user.click(cancelBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/swaps/swap-101/cancel');
    });
    expect(JSON.parse(localStorage.getItem('userData')).points).toBe(250);
  });

  it('shows Mark as completed on accepted swap for requester and owner, and renders read-only once completed', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-req', username: 'clara_mends', points: 235 }));
    let isCompleted = false;

    api.get.mockImplementation((url) => {
      if (url === '/swaps/swap-101') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...BASE_SWAP,
              status: isCompleted ? 'completed' : 'accepted',
              timeline: isCompleted
                ? [
                    ...BASE_SWAP.timeline,
                    { action: 'Status changed to accepted', date: '2026-11-24T12:00:00.000Z' },
                    { action: 'Status changed to completed', date: '2026-11-25T15:00:00.000Z' },
                  ]
                : [...BASE_SWAP.timeline, { action: 'Status changed to accepted', date: '2026-11-24T12:00:00.000Z' }],
            },
          },
        });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: { _id: 'user-req', username: 'clara_mends', points: 235 } } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.put.mockImplementation((url) => {
      if (url === '/swaps/swap-101/complete') {
        isCompleted = true;
        return Promise.resolve({ data: { success: true, data: { ...BASE_SWAP, status: 'completed' } } });
      }
      return Promise.reject(new Error(`Unexpected PUT ${url}`));
    });

    const user = userEvent.setup();
    renderSwapDetail();

    const completeBtn = await screen.findByRole('button', { name: /mark as completed/i });
    expect(screen.queryByRole('button', { name: /accept swap/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();

    await user.click(completeBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/swaps/swap-101/complete');
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /mark as completed/i })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
  });

  it('renders 09e error card when swap is not found or unauthorized', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-eve', username: 'eve', points: 100 }));
    api.get.mockRejectedValue({
      response: { status: 403, data: { message: 'Not authorized to view this swap' } },
    });

    renderSwapDetail();

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/This swap could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/SWAP_FORBIDDEN/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('labels requester hold row clearly without a negative sign on the item owner view', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-owner', username: 'mia_rewears', points: 100 }));
    api.get.mockResolvedValue({ data: { success: true, data: BASE_SWAP } });

    renderSwapDetail();

    expect(await screen.findByText(/clara_mends's points/i)).toBeInTheDocument();
    const txAmounts = screen.getAllByText('15 PTS');
    expect(txAmounts.length).toBeGreaterThan(0);
    expect(screen.queryByText('-15 PTS')).not.toBeInTheDocument();
  });

  it('supports keyboard arrow navigation on star radiogroup, requires mismatch reason for Not as described, and hides card when rated or expired', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-req', username: 'clara_mends', points: 235 }));
    const recentCompletedSwap = {
      ...BASE_SWAP,
      status: 'completed',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };

    api.get.mockImplementation((url) => {
      if (url === '/swaps/swap-101') {
        return Promise.resolve({ data: { success: true, data: recentCompletedSwap } });
      }
      if (url === '/swaps/swap-101/ratings') {
        return Promise.resolve({
          data: { success: true, data: { ratings: [], myRating: null, bothRated: false } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    api.post.mockResolvedValue({
      data: { success: true, data: { rating: { _id: 'rat-1', stars: 4 } } },
    });

    const user = userEvent.setup();
    renderSwapDetail();

    expect(await screen.findByText(/Rate this swap/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /@mia_rewears/i })).toHaveAttribute(
      'href',
      '/members/mia_rewears'
    );

    // Arrow key navigation through accessible star radiogroup
    const firstStar = screen.getByRole('radio', { name: '1 of 5' });
    firstStar.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');

    const fourthStar = screen.getByRole('radio', { name: '4 of 5' });
    expect(fourthStar).toHaveFocus();
    expect(fourthStar).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('4 of 5')).toBeInTheDocument();

    // Selecting Not as described shows consequence + requires reason
    await user.click(screen.getByLabelText(/Not as described/i));
    expect(
      screen.getByText(/an admin reviews it, and if upheld the points paid for this swap come back/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Submit rating/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /did not match its listing/i
    );
    expect(api.post).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/what did not match/i),
      'Hem was unstitched on arrival'
    );
    await user.type(screen.getByLabelText(/anything to add/i), 'Speedy shipping though.');
    await user.click(screen.getByRole('button', { name: /Submit rating/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/swaps/swap-101/rate', {
        stars: 4,
        matchStatus: 'no',
        comment: 'Speedy shipping though.',
        reason: 'Hem was unstitched on arrival',
      });
    });

    expect(
      await screen.findByText(/Thanks, your rating is visible once both of you rate or after 7 days\./i)
    ).toBeInTheDocument();
  });

  it('hides Rate this swap card once already rated or after the 7-day window', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'user-req', username: 'clara_mends', points: 235 }));
    const oldCompletedSwap = {
      ...BASE_SWAP,
      status: 'completed',
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };

    api.get.mockImplementation((url) => {
      if (url === '/swaps/swap-101') {
        return Promise.resolve({ data: { success: true, data: oldCompletedSwap } });
      }
      if (url === '/swaps/swap-101/ratings') {
        return Promise.resolve({
          data: { success: true, data: { ratings: [], myRating: null, bothRated: false } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderSwapDetail();

    expect(await screen.findByText(/This swap is complete/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rate this swap/i)).not.toBeInTheDocument();
  });
});
