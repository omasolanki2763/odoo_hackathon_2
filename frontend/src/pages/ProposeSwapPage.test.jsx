import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api';
import ProposeSwapPage from './ProposeSwapPage';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const WANTED_ITEM = {
  _id: 'wanted-1',
  title: 'Vintage Denim Chore Jacket',
  size: 'L',
  condition: 'good',
  category: 'outerwear',
  pointsValue: 75,
  status: 'available',
  images: [],
  userId: {
    _id: 'owner-1',
    username: 'marcus_b',
    createdAt: '2024-03-01T00:00:00.000Z',
  },
};

const MY_ITEMS = [
  {
    _id: 'offer-less',
    title: 'Fisherman Wool Ribbed Knit',
    size: 'M',
    condition: 'good',
    pointsValue: 60,
    status: 'available',
    images: [],
  },
  {
    _id: 'offer-more',
    title: 'Heavyweight Cashmere Coat',
    size: 'M',
    condition: 'like-new',
    pointsValue: 90,
    status: 'approved',
    images: [],
  },
  {
    _id: 'offer-reserved',
    title: 'Selvedge Denim Jeans',
    size: '32',
    condition: 'good',
    pointsValue: 65,
    status: 'reserved',
    images: [],
  },
  {
    _id: 'offer-swapped',
    title: 'Striped Linen Shirt',
    size: 'M',
    condition: 'good',
    pointsValue: 55,
    status: 'swapped',
    images: [],
  },
  {
    _id: 'offer-pending',
    title: 'Black Floral Slip Dress',
    size: 'S',
    condition: 'good',
    pointsValue: 75,
    status: 'pending',
    images: [],
  },
];

const renderPage = (search = '?item=wanted-1') =>
  render(
    <MemoryRouter initialEntries={[`/swaps/new${search}`]}>
      <Routes>
        <Route path="/swaps/new" element={<ProposeSwapPage />} />
        <Route path="/swaps/:id" element={<div data-testid="swap-detail-route">Swap Detail Route</div>} />
        <Route path="/add-item" element={<div data-testid="add-item-route">Add Item Route</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProposeSwapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ _id: 'me-1', username: 'clara_mends', points: 340 }));
  });

  it('shows wanted item details, allows only available/approved items, dims others with reasons, and toggles top-up rule from quote API', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/items/wanted-1') {
        return Promise.resolve({ data: { success: true, data: WANTED_ITEM } });
      }
      if (url === '/items/user/me') {
        return Promise.resolve({ data: { success: true, data: MY_ITEMS, pagination: { totalItems: 5 } } });
      }
      if (url === '/swaps/quote') {
        const offer = config?.params?.offer;
        const topUp = config?.params?.topUp;
        if (offer === 'offer-less') {
          const applied = topUp === 0 ? 0 : 15;
          return Promise.resolve({
            data: {
              success: true,
              data: {
                mode: 'swap',
                wantedItem: { _id: 'wanted-1', title: WANTED_ITEM.title, pointsValue: 75 },
                offeredItem: { _id: 'offer-less', title: 'Fisherman Wool Ribbed Knit', pointsValue: 60 },
                wantedPoints: 75,
                offeredPoints: 60,
                difference: 15,
                allowedTopUp: 15,
                topUpApplied: applied,
                balanceBefore: 340,
                balanceAfter: 340 - applied,
                canAffordTopUp: true,
              },
            },
          });
        }
        if (offer === 'offer-more') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                mode: 'swap',
                wantedItem: { _id: 'wanted-1', title: WANTED_ITEM.title, pointsValue: 75 },
                offeredItem: { _id: 'offer-more', title: 'Heavyweight Cashmere Coat', pointsValue: 90 },
                wantedPoints: 75,
                offeredPoints: 90,
                difference: -15,
                allowedTopUp: 0,
                topUpApplied: 0,
                balanceBefore: 340,
                balanceAfter: 340,
                canAffordTopUp: true,
              },
            },
          });
        }
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderPage();

    // Wait for wanted card & owner username
    expect(
      await screen.findByRole('heading', { name: 'Vintage Denim Chore Jacket' })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/@marcus_b/i).length).toBeGreaterThan(0);

    // Non-requestable items should be disabled with clear reasons
    const reservedRadio = screen.getByRole('radio', { name: /Selvedge Denim Jeans/i });
    const swappedRadio = screen.getByRole('radio', { name: /Striped Linen Shirt/i });
    const pendingRadio = screen.getByRole('radio', { name: /Black Floral Slip Dress/i });
    expect(reservedRadio).toBeDisabled();
    expect(swappedRadio).toBeDisabled();
    expect(pendingRadio).toBeDisabled();
    expect(screen.getByText(/reserved in another swap/i)).toBeInTheDocument();
    expect(screen.getByText(/already swapped/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for approval/i)).toBeInTheDocument();

    // First selectable item is auto-selected and worth less -> top-up checkbox defaults off until opted in
    const topUpCheckbox = await screen.findByRole('checkbox', { name: /add 15 points to balance it/i });
    expect(topUpCheckbox).not.toBeChecked();
    expect(screen.getByText(/You have 340\. After the swap: 340\./i)).toBeInTheDocument();

    // Checking top-up queries quote with topUp=15 and shows balanced state
    await user.click(topUpCheckbox);
    expect(topUpCheckbox).toBeChecked();
    expect(await screen.findByText(/Balanced: 60 \+ 15 = 75 points/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/You have 340\. After the swap: 325\./i)).toBeInTheDocument();
    });

    // Switching to an item worth more hides the top-up checkbox completely
    const moreRadio = screen.getByRole('radio', { name: /Heavyweight Cashmere Coat/i });
    await user.click(moreRadio);
    await waitFor(() => {
      expect(screen.queryByRole('checkbox', { name: /add .* points/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/No top-up needed: 90 vs 75 points/i)).toBeInTheDocument();
  });

  it('shows empty state with link to /add-item when user has no garments', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/items/wanted-1') {
        return Promise.resolve({ data: { success: true, data: WANTED_ITEM } });
      }
      if (url === '/items/user/me') {
        return Promise.resolve({ data: { success: true, data: [], pagination: { totalItems: 0 } } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderPage();

    const addLink = await screen.findByRole('link', { name: /List an item first/i });
    expect(addLink).toHaveAttribute('href', '/add-item');
  });

  it('submits swap with handover method, note/message counters, syncs auth-change balance, and navigates to swap detail', async () => {
    const authEvents = [];
    window.addEventListener('auth-change', (event) => authEvents.push(event.detail));

    api.get.mockImplementation((url) => {
      if (url === '/items/wanted-1') {
        return Promise.resolve({ data: { success: true, data: WANTED_ITEM } });
      }
      if (url === '/items/user/me') {
        return Promise.resolve({ data: { success: true, data: [MY_ITEMS[0]], pagination: { totalItems: 1 } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'swap',
              wantedPoints: 75,
              offeredPoints: 60,
              difference: 15,
              allowedTopUp: 15,
              topUpApplied: 15,
              balanceBefore: 340,
              balanceAfter: 325,
              canAffordTopUp: true,
            },
          },
        });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({
          data: { success: true, data: { _id: 'me-1', username: 'clara_mends', points: 325 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.post.mockResolvedValue({
      data: { success: true, data: { _id: 'swap-99', status: 'pending' } },
    });

    const user = userEvent.setup();
    renderPage();

    const topUpCheckbox = await screen.findByRole('checkbox', { name: /add 15 points to balance it/i });
    await user.click(topUpCheckbox);

    await user.click(screen.getByRole('radio', { name: /by post/i }));
    await user.type(screen.getByLabelText(/handover note/i), 'Trackable courier');
    await user.type(screen.getByLabelText(/message to/i), 'Happy to ship Tuesday.');

    expect(screen.getByText('17 / 300')).toBeInTheDocument();
    expect(screen.getByText('22 / 500')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send swap request/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/swaps', {
        itemId: 'wanted-1',
        requestedItemId: 'offer-less',
        type: 'swap',
        pointsOffered: 15,
        handoverMethod: 'post',
        handoverNote: 'Trackable courier',
        message: 'Happy to ship Tuesday.',
      });
    });

    expect(await screen.findByTestId('swap-detail-route')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('userData')).points).toBe(325);
    expect(authEvents.some((detail) => detail?.points === 325)).toBe(true);
  });

  it('refreshes sessionStorage header balance cleanly for unremembered logins', async () => {
    localStorage.clear();
    sessionStorage.setItem('token', 'session-only-token');
    sessionStorage.setItem(
      'userData',
      JSON.stringify({ _id: 'me-1', username: 'clara_mends', points: 340 })
    );

    const authEvents = [];
    window.addEventListener('auth-change', (event) => authEvents.push(event.detail));

    api.get.mockImplementation((url) => {
      if (url === '/items/wanted-1') {
        return Promise.resolve({ data: { success: true, data: WANTED_ITEM } });
      }
      if (url === '/items/user/me') {
        return Promise.resolve({ data: { success: true, data: [MY_ITEMS[0]], pagination: { totalItems: 1 } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'swap',
              wantedPoints: 75,
              offeredPoints: 60,
              difference: 15,
              allowedTopUp: 15,
              topUpApplied: 15,
              balanceBefore: 340,
              balanceAfter: 325,
              canAffordTopUp: true,
            },
          },
        });
      }
      if (url === '/auth/profile') {
        return Promise.resolve({
          data: { success: true, data: { _id: 'me-1', username: 'clara_mends', points: 325 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.post.mockResolvedValue({
      data: { success: true, data: { _id: 'swap-session-1', status: 'pending' } },
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: /add 15 points to balance it/i }));
    await user.click(screen.getByRole('button', { name: /send swap request/i }));

    expect(await screen.findByTestId('swap-detail-route')).toBeInTheDocument();
    expect(localStorage.getItem('userData')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('userData')).points).toBe(325);
    expect(authEvents.some((detail) => detail?.points === 325)).toBe(true);
  });

  it('shows API rejection errors in a role=alert region without leaving page', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/items/wanted-1') {
        return Promise.resolve({ data: { success: true, data: WANTED_ITEM } });
      }
      if (url === '/items/user/me') {
        return Promise.resolve({ data: { success: true, data: [MY_ITEMS[0]], pagination: { totalItems: 1 } } });
      }
      if (url === '/swaps/quote') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              mode: 'swap',
              wantedPoints: 75,
              offeredPoints: 60,
              difference: 15,
              allowedTopUp: 15,
              topUpApplied: 15,
              balanceBefore: 340,
              balanceAfter: 325,
              canAffordTopUp: true,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.post.mockRejectedValue({
      response: { data: { message: 'Item is no longer available for swapping' } },
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: /send swap request/i });
    await user.click(screen.getByRole('button', { name: /send swap request/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Item is no longer available for swapping/i)).toBeInTheDocument();
  });
});
