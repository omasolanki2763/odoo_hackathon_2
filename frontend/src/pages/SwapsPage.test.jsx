import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import SwapsPage from './SwapsPage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const SENT_SWAP = {
  _id: 'swap-sent-1',
  type: 'swap',
  status: 'pending',
  pointsOffered: 15,
  createdAt: '2026-11-25T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  requesterId: { _id: 'me-1', username: 'clara_mends' },
  itemOwnerId: { _id: 'u-2', username: 'mia_rewears' },
  itemId: { _id: 'i-1', title: 'Vintage Chore Jacket', pointsValue: 75, images: [] },
  requestedItemId: { _id: 'i-2', title: 'Fisherman Knit', pointsValue: 60, images: [] },
};

const RECEIVED_SWAP = {
  _id: 'swap-recv-1',
  type: 'swap',
  status: 'accepted',
  pointsOffered: 0,
  createdAt: '2026-11-24T09:00:00.000Z',
  requesterId: { _id: 'u-3', username: 'marcus_b' },
  itemOwnerId: { _id: 'me-1', username: 'clara_mends' },
  itemId: { _id: 'i-3', title: 'Selvedge Denim', pointsValue: 65, images: [] },
  requestedItemId: { _id: 'i-4', title: 'Oxford Button-Down', pointsValue: 65, images: [] },
};

const renderSwapsPage = () =>
  render(
    <MemoryRouter initialEntries={['/swaps']}>
      <Routes>
        <Route path="/swaps" element={<SwapsPage />} />
        <Route path="/swaps/:id" element={<div>Swap Detail Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('SwapsPage list, Sent/Received tabs & empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ _id: 'me-1', username: 'clara_mends', points: 100 }));
  });

  it('switches cleanly between Sent and Received tabs and links rows to /swaps/:id', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/swaps') {
        const direction = config?.params?.direction;
        if (direction === 'received') {
          return Promise.resolve({
            data: { success: true, data: { swaps: [RECEIVED_SWAP], pagination: { totalItems: 1 } } },
          });
        }
        return Promise.resolve({
          data: { success: true, data: { swaps: [SENT_SWAP], pagination: { totalItems: 1 } } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderSwapsPage();

    const sentLink = await screen.findByRole('link', { name: /Vintage Chore Jacket/i });
    expect(sentLink).toHaveAttribute('href', '/swaps/swap-sent-1');
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Received/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Selvedge Denim/i })).toHaveAttribute(
        'href',
        '/swaps/swap-recv-1'
      );
    });
    expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
  });

  it('shows honest empty state when user has no swaps in the active tab', async () => {
    api.get.mockResolvedValue({
      data: { success: true, data: { swaps: [], pagination: { totalItems: 0 } } },
    });

    renderSwapsPage();

    expect(await screen.findByText(/No sent requests yet/i)).toBeInTheDocument();
    const browseLinks = screen.getAllByRole('link', { name: /Browse catalogue/i });
    expect(browseLinks.length).toBeGreaterThanOrEqual(2);
    expect(browseLinks[1]).toHaveAttribute('href', '/items');
  });
});
