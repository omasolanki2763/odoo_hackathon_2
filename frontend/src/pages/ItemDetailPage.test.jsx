import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import ItemDetailPage from './ItemDetailPage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const TARGET_ITEM = {
  _id: 'item-42',
  title: 'Vintage Denim Chore Jacket',
  description: 'Heavyweight indigo twill work jacket.',
  category: 'outerwear',
  size: 'L',
  condition: 'good',
  pointsValue: 75,
  status: 'available',
  images: [],
  userId: {
    _id: 'owner-1',
    username: 'marcus_b',
    createdAt: '2024-03-01T00:00:00.000Z',
  },
};

const renderItemDetail = () =>
  render(
    <MemoryRouter initialEntries={['/items/item-42']}>
      <Routes>
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/login" element={<div>Login Route</div>} />
        <Route path="/swaps/new" element={<div>Propose Swap Route</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ItemDetailPage Redeem Dialog & Propose Swap Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ _id: 'me-1', username: 'clara_mends', points: 340 }));
  });

  it('links Propose a swap to /swaps/new?item=<id> and opens accessible redeem dialog with focus trap and Escape restore', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/items/item-42') {
        return Promise.resolve({ data: { success: true, data: TARGET_ITEM } });
      }
      if (url === '/items') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: { _id: 'me-1', username: 'clara_mends', points: 340 } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'redeem',
              cost: 75,
              balanceBefore: 340,
              balanceAfter: 265,
              canAfford: true,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderItemDetail();

    const proposeLink = await screen.findByRole('link', { name: 'Propose a swap' });
    expect(proposeLink).toHaveAttribute('href', '/swaps/new?item=item-42');

    const redeemTrigger = screen.getByRole('button', { name: 'Redeem for 75 points' });
    await user.click(redeemTrigger);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('340')).toBeInTheDocument();
    expect(within(dialog).getByText('- 75')).toBeInTheDocument();
    expect(within(dialog).getByText('265')).toBeInTheDocument();

    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
    const confirmBtn = within(dialog).getByRole('button', { name: 'Redeem for 75 points' });
    expect(cancelBtn).toHaveFocus();

    // Tabbing cycles within dialog and wraps back to Cancel
    await user.tab();
    expect(confirmBtn).toHaveFocus();
    await user.tab();
    expect(cancelBtn).toHaveFocus();

    // Shift+Tab wraps backwards to Confirm
    await user.tab({ shift: true });
    expect(confirmBtn).toHaveFocus();

    // Escape closes dialog and returns focus to trigger button
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(redeemTrigger).toHaveFocus();
  });

  it('disables confirm with short reason when balance is too low', async () => {
    localStorage.setItem('userData', JSON.stringify({ _id: 'me-1', username: 'clara_mends', points: 40 }));

    api.get.mockImplementation((url) => {
      if (url === '/items/item-42') {
        return Promise.resolve({ data: { success: true, data: TARGET_ITEM } });
      }
      if (url === '/items') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({ data: { success: true, data: { _id: 'me-1', username: 'clara_mends', points: 40 } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'redeem',
              cost: 75,
              balanceBefore: 40,
              balanceAfter: -35,
              canAfford: false,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderItemDetail();

    const redeemTrigger = await screen.findByRole('button', { name: 'Redeem for 75 points' });
    await user.click(redeemTrigger);

    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Redeem for 75 points' });
    expect(confirmBtn).toBeDisabled();
    expect(within(dialog).getByText(/need 35 more points/i)).toBeInTheDocument();
  });

  it('confirms direct redeem, refreshes header balance via auth-change, and marks item redeemed', async () => {
    let profileCalls = 0;
    const authEvents = [];
    window.addEventListener('auth-change', (event) => authEvents.push(event.detail));

    api.get.mockImplementation((url) => {
      if (url === '/items/item-42') {
        return Promise.resolve({ data: { success: true, data: TARGET_ITEM } });
      }
      if (url === '/items') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/auth/profile') {
        profileCalls += 1;
        const points = profileCalls === 1 ? 340 : 265;
        return Promise.resolve({ data: { success: true, data: { _id: 'me-1', username: 'clara_mends', points } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'redeem',
              cost: 75,
              balanceBefore: 340,
              balanceAfter: 265,
              canAfford: true,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          item: { ...TARGET_ITEM, status: 'redeemed' },
          user: { _id: 'me-1', points: 265 },
          pointsSpent: 75,
        },
      },
    });

    const user = userEvent.setup();
    renderItemDetail();

    await user.click(await screen.findByRole('button', { name: 'Redeem for 75 points' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Redeem for 75 points' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/swaps/redeem/direct', {
        itemId: 'item-42',
        pointsOffered: 75,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(JSON.parse(localStorage.getItem('userData')).points).toBe(265);
    expect(authEvents.some((detail) => detail?.points === 265)).toBe(true);
    expect(screen.getByText(/Redeemed for 75 points/i)).toBeInTheDocument();
  });
});
